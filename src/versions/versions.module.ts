import { Module } from '@nestjs/common';
import { VersionsController } from './versions.controller.js';
import { VehicleModule } from '../vehicle/vehicle.module.js';

@Module({
  imports: [VehicleModule],
  controllers: [VersionsController],
})
export class VersionsModule {}
