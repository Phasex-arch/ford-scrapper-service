import { Module } from '@nestjs/common';
import { ColorsController } from './colors.controller.js';
import { VehicleModule } from '../vehicle/vehicle.module.js';

@Module({
  imports: [VehicleModule],
  controllers: [ColorsController],
})
export class ColorsModule {}
