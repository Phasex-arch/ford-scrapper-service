import { Module } from '@nestjs/common';
import { AuditLogService } from './application/audit-log.service.js';
import { AuditLogRepository } from './infrastructure/repositories/audit-log.repository.js';
import { AuditLogController } from './presentation/audit-log.controller.js';

@Module({
  controllers: [AuditLogController],
  providers: [AuditLogService, AuditLogRepository],
})
export class AuditLogModule {}
