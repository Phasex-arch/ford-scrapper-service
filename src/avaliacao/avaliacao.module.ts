import { Module } from '@nestjs/common';
import { AvaliacaoService } from './application/avaliacao.service.js';
import { AvaliacaoRepository } from './infrastructure/avaliacao.repository.js';
import { AvaliacaoController } from './presentation/avaliacao.controller.js';

@Module({
  controllers: [AvaliacaoController],
  providers: [AvaliacaoService, AvaliacaoRepository],
  exports: [AvaliacaoService],
})
export class AvaliacaoModule {}
