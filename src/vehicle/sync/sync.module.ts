import { Module } from '@nestjs/common';
import { SyncController } from './sync.controller.js';
import { SyncService } from './sync.service.js';
import { ScrapperModule } from '../../scrapper/scrapper.module.js';
import { VehicleModule } from '../vehicle.module.js';

@Module({
  imports: [ScrapperModule, VehicleModule],
  controllers: [SyncController],
  providers: [SyncService],
})
export class SyncModule {}
