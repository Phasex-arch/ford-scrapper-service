import { Module } from '@nestjs/common';
import { ClienteModule } from '../cliente/cliente.module.js';
import { VeiculoClienteService } from './application/veiculo-cliente.service.js';
import { VeiculoClienteRepository } from './infrastructure/veiculo-cliente.repository.js';
import { VeiculoClienteController } from './presentation/veiculo-cliente.controller.js';

@Module({
  imports: [ClienteModule],
  controllers: [VeiculoClienteController],
  providers: [VeiculoClienteService, VeiculoClienteRepository],
  exports: [VeiculoClienteService],
})
export class VeiculoClienteModule {}
