import { Module } from '@nestjs/common';
import { VehicleController } from './presentation/vehicle.controller.js';
import { VehicleService } from './application/vehicle/vehicle.service.js';
import { VehicleRepository } from './infrastructure/repositories/vehicle.repository.js';
import { PrismaService } from '../../prisma/prisma.service.js';

@Module({
  controllers: [VehicleController],
  providers: [VehicleService, VehicleRepository, PrismaService],
  exports: [VehicleService, VehicleRepository, PrismaService],
})
export class VehicleModule {}
