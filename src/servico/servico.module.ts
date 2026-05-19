import { Module } from '@nestjs/common';
import { ServicoService } from './application/servico.service.js';
import { ServicoRepository } from './infrastructure/servico.repository.js';
import { ServicoController } from './presentation/servico.controller.js';

@Module({
  controllers: [ServicoController],
  providers: [ServicoService, ServicoRepository],
  exports: [ServicoService, ServicoRepository],
})
export class ServicoModule {}
