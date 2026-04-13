import { Module } from '@nestjs/common';
import { CategoriesController } from './categories.controller.js';
import { VehicleModule } from '../vehicle/vehicle.module.js';

@Module({
  imports: [VehicleModule],
  controllers: [CategoriesController],
})
export class CategoriesModule {}
