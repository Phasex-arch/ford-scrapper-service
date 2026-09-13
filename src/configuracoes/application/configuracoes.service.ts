import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { ConfiguracoesRepository } from '../infrastructure/configuracoes.repository.js';
import type { UpdateConcessionariaDto } from './dto/update-concessionaria.dto.js';

export interface SegurancaStatus {
  /** AuditInterceptor é global — está sempre ativo, não é uma opção configurável. */
  auditLogAtivo: true;
  /** Valor real configurado via JWT_EXPIRES_IN, não um número fixo de tela. */
  jwtExpiresIn: string;
}

@Injectable()
export class ConfiguracoesService {
  constructor(
    private readonly repo: ConfiguracoesRepository,
    private readonly config: ConfigService,
  ) {}

  findConcessionaria() {
    return this.repo.findConcessionaria();
  }

  updateConcessionaria(dto: UpdateConcessionariaDto) {
    return this.repo.updateConcessionaria(dto);
  }

  seguranca(): SegurancaStatus {
    return {
      auditLogAtivo: true,
      jwtExpiresIn: this.config.get<string>('JWT_EXPIRES_IN') ?? '8h',
    };
  }
}
