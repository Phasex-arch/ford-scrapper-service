import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { createHmac } from 'node:crypto';

/**
 * Keyed hashing para colunas de lookup e pseudonimização (slides 19, 21).
 *
 * - `lookupHash` -> HMAC-SHA256 com pepper, ideal para indexar campos
 *   sensíveis (ex.: cpf) sem decifrar a tabela inteira.
 * - `pseudonymize` -> HMAC-SHA256 determinístico por domínio, próprio para
 *   compartilhar identificadores em dashboards/ML sem expor o valor real.
 */
@Injectable()
export class HashService implements OnModuleInit {
  private readonly logger = new Logger(HashService.name);
  private pepper: string | null = null;

  constructor(private readonly config: ConfigService) {}

  onModuleInit(): void {
    const pepper = this.config.get<string>('DATA_ENCRYPTION_PEPPER');
    if (!pepper || pepper.length < 32) {
      this.logger.warn(
        'DATA_ENCRYPTION_PEPPER ausente ou curto; hashing pseudonimizado ficará indisponível. Gere com: openssl rand -hex 32',
      );
      return;
    }
    this.pepper = pepper;
  }

  isAvailable(): boolean {
    return this.pepper !== null;
  }

  private requirePepper(): string {
    if (!this.pepper) {
      throw new Error(
        'HashService indisponível: defina DATA_ENCRYPTION_PEPPER (>=32 chars) no ambiente',
      );
    }
    return this.pepper;
  }

  lookupHash(value: string): string {
    const pepper = this.requirePepper();
    const normalized = value.replace(/\D/g, '').toLowerCase();
    return createHmac('sha256', pepper).update(normalized).digest('hex');
  }

  pseudonymize(value: string, domain: string = 'default'): string {
    const pepper = this.requirePepper();
    return createHmac('sha256', `${pepper}:${domain}`)
      .update(value.trim().toLowerCase())
      .digest('hex')
      .slice(0, 32);
  }
}
