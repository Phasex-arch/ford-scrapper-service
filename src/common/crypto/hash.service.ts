import { Injectable, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { createHmac } from 'node:crypto';

/**
 * Keyed hashing for lookup columns and pseudonymization (slides 19, 21).
 *
 * - `lookupHash` -> HMAC-SHA256 with the pepper, used as the indexed `cpfHash`
 *   column so we can find a Lead by CPF without decrypting the entire table.
 * - `pseudonymize` -> deterministic HMAC-SHA256 for fields shared with ML
 *   models / dashboards (`vinSharePseudo`). Reversible only by holders of the
 *   pepper, satisfying the slide-21 definition of pseudonymization.
 */
@Injectable()
export class HashService implements OnModuleInit {
  private pepper!: string;

  constructor(private readonly config: ConfigService) {}

  onModuleInit(): void {
    const pepper = this.config.get<string>('DATA_ENCRYPTION_PEPPER');
    if (!pepper || pepper.length < 32) {
      throw new Error(
        'DATA_ENCRYPTION_PEPPER is required and must be at least 32 chars. ' +
          'Generate with: openssl rand -hex 32',
      );
    }
    this.pepper = pepper;
  }

  lookupHash(value: string): string {
    const normalized = value.replace(/\D/g, '').toLowerCase();
    return createHmac('sha256', this.pepper).update(normalized).digest('hex');
  }

  pseudonymize(value: string, domain: string = 'default'): string {
    return createHmac('sha256', `${this.pepper}:${domain}`)
      .update(value.trim().toLowerCase())
      .digest('hex')
      .slice(0, 32);
  }
}
