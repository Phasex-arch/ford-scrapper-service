import { Module } from '@nestjs/common';
import { EstoqueService } from './application/estoque.service.js';
import { EstoqueRepository } from './infrastructure/estoque.repository.js';
import { EstoqueController } from './presentation/estoque.controller.js';

@Module({
  controllers: [EstoqueController],
  providers: [EstoqueService, EstoqueRepository],
  exports: [EstoqueService, EstoqueRepository],
})
export class EstoqueModule {}
