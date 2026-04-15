import { Module } from '@nestjs/common';
import { ModelsController } from './models.controller.js';
import { VehicleModule } from '../vehicle/vehicle.module.js';

@Module({
  imports: [VehicleModule],
  controllers: [ModelsController],
})
export class ModelsModule {}
