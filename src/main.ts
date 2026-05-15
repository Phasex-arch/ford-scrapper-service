import { Logger, ValidationPipe } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import helmet from 'helmet';

import { AppModule } from './app.module.js';
import { HttpExceptionFilter } from './common/filters/http-exception.filter.js';

async function bootstrap() {
  const app = await NestFactory.create(AppModule, {
    bodyParser: true,
  });
  const logger = new Logger('Bootstrap');

  app.setGlobalPrefix('api/v1');

  app.use(
    helmet({
      contentSecurityPolicy: false,
      crossOriginEmbedderPolicy: false,
    }),
  );

  const corsOrigins = (process.env.CORS_ORIGINS ?? '*')
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean);

  app.enableCors({
    origin: corsOrigins.length === 1 && corsOrigins[0] === '*' ? true : corsOrigins,
    methods: 'GET,HEAD,PUT,PATCH,POST,DELETE,OPTIONS',
    allowedHeaders: 'Content-Type,Authorization,X-Request-Id',
    exposedHeaders: 'X-Request-Id',
    credentials: false,
    maxAge: 600,
  });

  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
      transformOptions: { enableImplicitConversion: true },
      stopAtFirstError: false,
    }),
  );

  app.useGlobalFilters(new HttpExceptionFilter());

  const swaggerConfig = new DocumentBuilder()
    .setTitle('Ford Brasil Vehicle Catalog & Dealership API')
    .setDescription(
      [
        'API profissional para consulta de veiculos Ford Brasil e gestao da concessionaria.',
        '',
        'Inclui: autenticacao JWT (RBAC), gestao de colaboradores, clientes, estoque, leads, financiamentos,',
        'ordens de servico, tecnicos, metas, avaliacoes (publicas) e dashboard agregado.',
        '',
        'Camadas de seguranca: Helmet, CORS configuravel, ThrottlerGuard global, JwtAuthGuard global,',
        'ValidationPipe global, HttpExceptionFilter padronizado, LoggingMiddleware + AuditInterceptor.',
      ].join('\n'),
    )
    .setVersion('1.1.0')
    .addBearerAuth(
      {
        type: 'http',
        scheme: 'bearer',
        bearerFormat: 'JWT',
        description: 'Cole o accessToken retornado por POST /auth/login',
      },
      'JWT',
    )
    .addTag('Auth', 'Autenticacao JWT, login e registro de colaboradores')
    .addTag('Colaboradores', 'CRUD de colaboradores e gestao de papeis')
    .addTag('Clientes', 'CRUD de clientes da concessionaria')
    .addTag('Estoque', 'CRUD de veiculos em estoque')
    .addTag('Leads', 'Pipeline de leads inteligentes')
    .addTag('Financiamentos', 'Carteira de financiamentos')
    .addTag('Servicos', 'Ordens de servico (oficina)')
    .addTag('Tecnicos', 'Equipe tecnica da oficina')
    .addTag('Metas', 'Metas e indicadores comerciais')
    .addTag('Avaliacoes', 'Avaliacoes de clientes (endpoints publicos)')
    .addTag('Dashboard', 'KPIs agregados em tempo real')
    .addTag('Health', 'Health check do servico')
    .addTag('Vehicles', 'Catalogo Ford (scrapping)')
    .addTag('Sync', 'Sincronizacao com o site oficial')
    .build();

  const document = SwaggerModule.createDocument(app, swaggerConfig);
  SwaggerModule.setup('api/docs', app, document, {
    swaggerOptions: { persistAuthorization: true },
  });

  const port = process.env.PORT ?? 3000;
  await app.listen(port);
  logger.log(`Application running on http://localhost:${port}`);
  logger.log(`Swagger docs available at http://localhost:${port}/api/docs`);
}

void bootstrap();
