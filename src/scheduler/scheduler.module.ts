import { Module } from '@nestjs/common';
import { LifecycleJobsService } from './lifecycle-jobs.service.js';

@Module({
  providers: [LifecycleJobsService],
})
export class SchedulerModule {}
