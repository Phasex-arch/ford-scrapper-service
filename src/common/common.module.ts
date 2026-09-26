import { Global, Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { PrismaService } from '../../prisma/prisma.service.js';
import { AuditInterceptor } from './interceptors/audit.interceptor.js';
import { SecurityEventLogger } from './security/security-event.logger.js';
import { AesGcmService } from './crypto/aes-gcm.service.js';
import { HashService } from './crypto/hash.service.js';
import { MetricsService } from './metrics/metrics.service.js';

@Global()
@Module({
  imports: [ConfigModule],
  providers: [
    PrismaService,
    AuditInterceptor,
    SecurityEventLogger,
    AesGcmService,
    HashService,
    MetricsService,
  ],
  exports: [
    PrismaService,
    AuditInterceptor,
    SecurityEventLogger,
    AesGcmService,
    HashService,
    MetricsService,
  ],
})
export class CommonModule {}
