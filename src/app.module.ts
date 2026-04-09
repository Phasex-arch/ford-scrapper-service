import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { ScrapperModule } from './scrapper/scrapper.module.js';
import { VehicleService } from './vehicle/application/vehicle/vehicle.service.js';
import { VehicleRepository } from './vehicle/infrastructure/repositories/vehicle.repository.js';
import { PrismaService } from '../prisma/prisma.service.js';

@Module({
  imports: [ConfigModule.forRoot({ isGlobal: true }), ScrapperModule],
  controllers: [],
  providers: [VehicleService, VehicleRepository, PrismaService],
})
export class AppModule {}
