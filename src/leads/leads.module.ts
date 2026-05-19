import { Module } from '@nestjs/common';
import { LeadsController } from './leads.controller.js';
import { LeadsService } from './leads.service.js';
import { LeadsRetentionCron } from './leads-retention.cron.js';
import { IdempotencyMiddleware } from '../common/middleware/idempotency.middleware.js';

@Module({
  controllers: [LeadsController],
  providers: [LeadsService, LeadsRetentionCron, IdempotencyMiddleware],
  exports: [LeadsService],
})
export class LeadsModule {}
