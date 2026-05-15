import { Module } from '@nestjs/common';
import { TecnicoService } from './application/tecnico.service.js';
import { TecnicoRepository } from './infrastructure/tecnico.repository.js';
import { TecnicoController } from './presentation/tecnico.controller.js';

@Module({
  controllers: [TecnicoController],
  providers: [TecnicoService, TecnicoRepository],
  exports: [TecnicoService, TecnicoRepository],
})
export class TecnicoModule {}
