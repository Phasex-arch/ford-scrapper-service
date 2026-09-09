import { MiddlewareConsumer, Module, NestModule } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { APP_GUARD } from '@nestjs/core';
import { ThrottlerGuard, ThrottlerModule } from '@nestjs/throttler';

import { ScrapperModule } from './scrapper/scrapper.module.js';
import { VehicleModule } from './vehicle/vehicle.module.js';
import { HealthModule } from './health/health.module.js';
import { SyncModule } from './vehicle/sync/sync.module.js';

import { CommonModule } from './common/common.module.js';
import { LoggingMiddleware } from './common/middleware/logging.middleware.js';

import { AuthModule } from './auth/auth.module.js';
import { JwtAuthGuard } from './auth/infrastructure/guards/jwt-auth.guard.js';

import { ColaboradorModule } from './colaborador/colaborador.module.js';
import { AvaliacaoModule } from './avaliacao/avaliacao.module.js';
import { ClienteModule } from './cliente/cliente.module.js';
import { EstoqueModule } from './estoque/estoque.module.js';
import { FinanciamentoModule } from './financiamento/financiamento.module.js';
import { LeadModule } from './lead/lead.module.js';
import { MetaModule } from './meta/meta.module.js';
import { ServicoModule } from './servico/servico.module.js';
import { TecnicoModule } from './tecnico/tecnico.module.js';
import { DashboardModule } from './dashboard/dashboard.module.js';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    ThrottlerModule.forRoot({
      throttlers: [{ ttl: 60_000, limit: 60 }],
    }),

    CommonModule,
    AuthModule,

    ColaboradorModule,
    AvaliacaoModule,
    ClienteModule,
    EstoqueModule,
    FinanciamentoModule,
    LeadModule,
    MetaModule,
    ServicoModule,
    TecnicoModule,
    DashboardModule,

    ScrapperModule,
    VehicleModule,
    HealthModule,
    SyncModule,
  ],
  controllers: [],
  providers: [
    { provide: APP_GUARD, useClass: ThrottlerGuard },
    { provide: APP_GUARD, useClass: JwtAuthGuard },
  ],
})
export class AppModule implements NestModule {
  configure(consumer: MiddlewareConsumer): void {
    consumer.apply(LoggingMiddleware).forRoutes('{*splat}');
  }
}
