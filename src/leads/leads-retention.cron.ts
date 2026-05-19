import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { LeadsService } from './leads.service.js';
import { IdempotencyMiddleware } from '../common/middleware/idempotency.middleware.js';

/**
 * Daily LGPD retention sweep (slide 20).
 * Anonymizes leads whose `retainUntil` has passed and purges expired
 * idempotency keys. Both housekeeping tasks are idempotent.
 */
@Injectable()
export class LeadsRetentionCron {
  private readonly logger = new Logger(LeadsRetentionCron.name);

  constructor(
    private readonly leads: LeadsService,
    private readonly idem: IdempotencyMiddleware,
  ) {}

  @Cron(CronExpression.EVERY_DAY_AT_3AM)
  async handle(): Promise<void> {
    try {
      const anonymized = await this.leads.runRetentionSweep();
      const purged = await this.idem.purgeExpired();
      this.logger.log(
        `Retention cron complete — leads anonymized=${anonymized}, idempotency keys purged=${purged}`,
      );
    } catch (err) {
      this.logger.error(`Retention cron failed: ${(err as Error).message}`);
    }
  }
}
