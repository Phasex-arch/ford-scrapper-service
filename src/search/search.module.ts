import { Module } from '@nestjs/common';
import { SearchController } from './search.controller.js';
import { VehicleModule } from '../vehicle/vehicle.module.js';

@Module({
  imports: [VehicleModule],
  controllers: [SearchController],
})
export class SearchModule {}
