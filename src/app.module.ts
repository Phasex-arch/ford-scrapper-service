import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { ThrottlerModule } from '@nestjs/throttler';
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
  providers: [],
})
export class AppModule {}
