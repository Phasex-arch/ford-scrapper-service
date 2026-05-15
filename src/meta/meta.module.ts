import { Module } from '@nestjs/common';
import { MetaService } from './application/meta.service.js';
import { MetaRepository } from './infrastructure/meta.repository.js';
import { MetaController } from './presentation/meta.controller.js';

@Module({
  controllers: [MetaController],
  providers: [MetaService, MetaRepository],
  exports: [MetaService, MetaRepository],
})
export class MetaModule {}
