import { Module } from '@nestjs/common';
import { FinanciamentoService } from './application/financiamento.service.js';
import { FinanciamentoRepository } from './infrastructure/financiamento.repository.js';
import { FinanciamentoController } from './presentation/financiamento.controller.js';

@Module({
  controllers: [FinanciamentoController],
  providers: [FinanciamentoService, FinanciamentoRepository],
  exports: [FinanciamentoService, FinanciamentoRepository],
})
export class FinanciamentoModule {}
