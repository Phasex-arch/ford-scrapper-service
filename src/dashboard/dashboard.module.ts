import { Module } from '@nestjs/common';
import { DashboardService } from './application/dashboard.service.js';
import { DashboardController } from './presentation/dashboard.controller.js';

@Module({
  controllers: [DashboardController],
  providers: [DashboardService],
  exports: [DashboardService],
})
export class DashboardModule {}
