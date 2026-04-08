import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { ScrapperModule } from './scrapper/scrapper.module.js';
import { VehicleService } from './vehicle/application/vehicle/vehicle.service';

@Module({
  imports: [ConfigModule.forRoot({ isGlobal: true }), ScrapperModule],
  controllers: [],
  providers: [VehicleService],
})
export class AppModule {}
