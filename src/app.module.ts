import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { ThrottlerModule } from '@nestjs/throttler';
import { ScrapperModule } from './scrapper/scrapper.module.js';
import { VehicleModule } from './vehicle/vehicle.module.js';
import { HealthModule } from './health/health.module.js';
import { SyncModule } from './vehicle/sync/sync.module.js';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    ThrottlerModule.forRoot({
      throttlers: [
        {
          ttl: 60000,
          limit: 60,
        },
      ],
    }),
    ScrapperModule,
    VehicleModule,
    HealthModule,
    SyncModule,
  ],
  controllers: [],
  providers: [],
})
export class AppModule {}
