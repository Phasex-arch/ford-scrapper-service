import {
  MiddlewareConsumer,
  Module,
  NestModule,
  RequestMethod,
} from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { APP_GUARD, APP_INTERCEPTOR } from '@nestjs/core';
import { ScheduleModule } from '@nestjs/schedule';
import { ThrottlerGuard, ThrottlerModule } from '@nestjs/throttler';
import { LoggerModule } from 'nestjs-pino';

import { buildPinoConfig } from './common/logger/pino-logger.config.js';
import { CommonModule } from './common/common.module.js';
import { JwtAuthGuard } from './auth/guards/jwt-auth.guard.js';
import { RolesGuard } from './auth/guards/roles.guard.js';
import { RequestIdInterceptor } from './common/interceptors/request-id.interceptor.js';
import { AuditInterceptor } from './common/interceptors/audit.interceptor.js';
import { IdempotencyMiddleware } from './common/middleware/idempotency.middleware.js';
import { PayloadSignatureMiddleware } from './common/middleware/payload-signature.middleware.js';

import { AuthModule } from './auth/auth.module.js';
import { AuditModule } from './audit/audit.module.js';
import { LeadsModule } from './leads/leads.module.js';
import { ScrapperModule } from './scrapper/scrapper.module.js';
import { VehicleModule } from './vehicle/vehicle.module.js';
import { HealthModule } from './health/health.module.js';
import { CategoriesModule } from './categories/categories.module.js';
import { ColorsModule } from './colors/colors.module.js';
import { ModelsModule } from './models/models.module.js';
import { VersionsModule } from './versions/versions.module.js';
import { SearchModule } from './search/search.module.js';
import { SyncModule } from './sync/sync.module.js';
import { SourcesModule } from './sources/sources.module.js';
import { StatsModule } from './stats/stats.module.js';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    LoggerModule.forRoot(buildPinoConfig()),
    ScheduleModule.forRoot(),
    ThrottlerModule.forRoot({
      throttlers: [
        {
          name: 'default',
          ttl: 60_000,
          limit: 60,
        },
      ],
    }),
    CommonModule,
    AuthModule,
    AuditModule,
    LeadsModule,
    ScrapperModule,
    VehicleModule,
    HealthModule,
    CategoriesModule,
    ColorsModule,
    ModelsModule,
    VersionsModule,
    SearchModule,
    SyncModule,
    SourcesModule,
    StatsModule,
  ],
  controllers: [],
  providers: [
    { provide: APP_INTERCEPTOR, useClass: RequestIdInterceptor },
    { provide: APP_INTERCEPTOR, useClass: AuditInterceptor },
    { provide: APP_GUARD, useClass: JwtAuthGuard },
    { provide: APP_GUARD, useClass: RolesGuard },
    { provide: APP_GUARD, useClass: ThrottlerGuard },
  ],
})
export class AppModule implements NestModule {
  configure(consumer: MiddlewareConsumer): void {
    // Idempotency-Key required on unsafe lead / sync routes (slide 16).
    consumer
      .apply(IdempotencyMiddleware)
      .forRoutes(
        { path: 'leads', method: RequestMethod.POST },
        { path: 'leads/:id/anonymize', method: RequestMethod.POST },
        { path: 'sync', method: RequestMethod.POST },
        { path: 'scrapper/ford', method: RequestMethod.POST },
      );

    // HMAC signature on the most privileged write endpoints.
    consumer
      .apply(PayloadSignatureMiddleware)
      .forRoutes(
        { path: 'sync', method: RequestMethod.POST },
        { path: 'scrapper/ford', method: RequestMethod.POST },
      );
  }
}
