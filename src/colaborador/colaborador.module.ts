import { Module } from '@nestjs/common';
import { ColaboradorService } from './application/colaborador.service.js';
import { ColaboradorRepository } from './infrastructure/repositories/colaborador.repository.js';
import { ColaboradorController } from './presentation/colaborador.controller.js';

@Module({
  controllers: [ColaboradorController],
  providers: [ColaboradorService, ColaboradorRepository],
  exports: [ColaboradorService, ColaboradorRepository],
})
export class ColaboradorModule {}
