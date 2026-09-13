import { Module } from '@nestjs/common';
import { ConfiguracoesService } from './application/configuracoes.service.js';
import { ConfiguracoesRepository } from './infrastructure/configuracoes.repository.js';
import { ConfiguracoesController } from './presentation/configuracoes.controller.js';

@Module({
  controllers: [ConfiguracoesController],
  providers: [ConfiguracoesService, ConfiguracoesRepository],
  exports: [ConfiguracoesService, ConfiguracoesRepository],
})
export class ConfiguracoesModule {}
