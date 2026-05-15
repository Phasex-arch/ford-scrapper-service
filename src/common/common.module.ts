import { Global, Module } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service.js';
import { AuditInterceptor } from './interceptors/audit.interceptor.js';
import { SecurityEventLogger } from './security/security-event.logger.js';

@Global()
@Module({
  providers: [PrismaService, AuditInterceptor, SecurityEventLogger],
  exports: [PrismaService, AuditInterceptor, SecurityEventLogger],
})
export class CommonModule {}
