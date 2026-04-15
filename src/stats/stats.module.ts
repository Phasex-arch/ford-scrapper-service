import { Module } from '@nestjs/common';
import { StatsController } from './stats.controller.js';
import { VehicleModule } from '../vehicle/vehicle.module.js';

@Module({
  imports: [VehicleModule],
  controllers: [StatsController],
})
export class StatsModule {}
