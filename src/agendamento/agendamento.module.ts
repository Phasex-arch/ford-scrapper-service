import { Module } from '@nestjs/common';
import { AgendamentoService } from './application/agendamento.service.js';
import { AgendamentoRepository } from './infrastructure/agendamento.repository.js';
import { AgendamentoController } from './presentation/agendamento.controller.js';

@Module({
  controllers: [AgendamentoController],
  providers: [AgendamentoService, AgendamentoRepository],
  exports: [AgendamentoService, AgendamentoRepository],
})
export class AgendamentoModule {}
