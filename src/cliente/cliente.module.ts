import { Module } from '@nestjs/common';
import { ClienteService } from './application/cliente.service.js';
import { ClienteRepository } from './infrastructure/cliente.repository.js';
import { ClienteController } from './presentation/cliente.controller.js';

@Module({
  controllers: [ClienteController],
  providers: [ClienteService, ClienteRepository],
  exports: [ClienteService, ClienteRepository],
})
export class ClienteModule {}
