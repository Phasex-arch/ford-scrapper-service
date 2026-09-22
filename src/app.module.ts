import { MiddlewareConsumer, Module, NestModule } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { APP_GUARD } from '@nestjs/core';
import { ScheduleModule } from '@nestjs/schedule';
import { ThrottlerGuard, ThrottlerModule } from '@nestjs/throttler';
import { LoggerModule } from 'nestjs-pino';

import { ScrapperModule } from './scrapper/scrapper.module.js';
import { VehicleModule } from './vehicle/vehicle.module.js';
import { HealthModule } from './health/health.module.js';
import { SyncModule } from './vehicle/sync/sync.module.js';

import { CommonModule } from './common/common.module.js';
import { LoggingMiddleware } from './common/middleware/logging.middleware.js';

import { AuthModule } from './auth/auth.module.js';
import { JwtAuthGuard } from './auth/infrastructure/guards/jwt-auth.guard.js';

import { ColaboradorModule } from './colaborador/colaborador.module.js';
import { AgendamentoModule } from './agendamento/agendamento.module.js';
import { ConfiguracoesModule } from './configuracoes/configuracoes.module.js';
import { AvaliacaoModule } from './avaliacao/avaliacao.module.js';
import { ClienteModule } from './cliente/cliente.module.js';
import { EstoqueModule } from './estoque/estoque.module.js';
import { FinanciamentoModule } from './financiamento/financiamento.module.js';
import { LeadModule } from './lead/lead.module.js';
import { MetaModule } from './meta/meta.module.js';
import { ServicoModule } from './servico/servico.module.js';
import { TecnicoModule } from './tecnico/tecnico.module.js';
import { DashboardModule } from './dashboard/dashboard.module.js';
import { VeiculoClienteModule } from './veiculo-cliente/veiculo-cliente.module.js';
import { AuditLogModule } from './audit-log/audit-log.module.js';
import { SchedulerModule } from './scheduler/scheduler.module.js';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    // Logger real (pino, NDJSON) — antes a dependência estava instalada mas
    // nunca conectada, e todo log saía pelo Logger padrão do Nest sem
    // estrutura. autoLogging fica desligado porque o LoggingMiddleware já
    // cobre o log de requisição/resposta com os campos que o projeto usa
    // (requestId, sensitive); aqui o pino só vira o "motor" por trás de
    // todo `Logger`/`this.logger.log(...)` do app, incluindo o middleware.
    LoggerModule.forRoot({
      pinoHttp: {
        autoLogging: false,
        level: process.env.LOG_LEVEL ?? 'info',
        redact: {
          paths: [
            'req.headers.authorization',
            'req.headers.cookie',
            'req.body.senha',
            'req.body.senhaAtual',
            'req.body.novaSenha',
          ],
          censor: '[REDACTED]',
        },
        transport:
          process.env.NODE_ENV === 'production'
            ? undefined
            : { target: 'pino-pretty', options: { singleLine: true, colorize: true } },
      },
    }),
    ThrottlerModule.forRoot({
      throttlers: [{ ttl: 60_000, limit: 60 }],
    }),
    // Motor dos jobs automáticos da auditoria (seção 0): Agendamento→OS,
    // reavaliação de urgência de Lead, decaimento de Cliente.status.
    ScheduleModule.forRoot(),

    CommonModule,
    AuthModule,

    ColaboradorModule,
    AgendamentoModule,
    ConfiguracoesModule,
    AvaliacaoModule,
    ClienteModule,
    EstoqueModule,
    FinanciamentoModule,
    LeadModule,
    MetaModule,
    ServicoModule,
    TecnicoModule,
    DashboardModule,
    VeiculoClienteModule,
    AuditLogModule,

    ScrapperModule,
    VehicleModule,
    HealthModule,
    SyncModule,
    SchedulerModule,
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
