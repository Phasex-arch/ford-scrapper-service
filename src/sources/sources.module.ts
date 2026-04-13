import { Module } from '@nestjs/common';
import { SourcesController } from './sources.controller.js';
import { VehicleModule } from '../vehicle/vehicle.module.js';

@Module({
  imports: [VehicleModule],
  controllers: [SourcesController],
})
export class SourcesModule {}
