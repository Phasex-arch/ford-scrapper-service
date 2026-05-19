import { Logger, ValidationPipe } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import helmet from 'helmet';
import { json, urlencoded } from 'express';

import { AppModule } from './app.module.js';
import { HttpExceptionFilter } from './common/filters/http-exception.filter.js';

/**
 * Bootstrap endurecido segundo a rubrica de Cybersecurity Sprint:
 * - Helmet (slide 15) define HSTS, X-Content-Type-Options, frameguard etc.
 * - Body size cap em 100kb (slide 8) impede payload flooding.
 * - CORS por allow-list (slide 17) — `*` é rejeitado explicitamente.
 * - ValidationPipe global com whitelist + forbidNonWhitelisted (slide 5).
 * - HttpExceptionFilter padronizado evita vazar stack traces (slide 9).
 * - `trust proxy` repassa o IP real do cliente para audit/logging.
 */
async function bootstrap() {
  const app = await NestFactory.create(AppModule, { bodyParser: true });
  const logger = new Logger('Bootstrap');

  app.setGlobalPrefix('api/v1');

  // Trust o primeiro reverse proxy (TLS terminator) para X-Forwarded-*.
  const httpAdapter = app.getHttpAdapter();
  const expressInstance = httpAdapter.getInstance() as unknown as {
    set: (k: string, v: unknown) => void;
  };
  expressInstance.set('trust proxy', 1);

  // Cap em 100kb evita buffer-flooding em rotas JSON-heavy.
  app.use(json({ limit: '100kb' }));
  app.use(urlencoded({ limit: '100kb', extended: true }));

  app.use(
    helmet({
      contentSecurityPolicy: false,
      crossOriginEmbedderPolicy: false,
    }),
  );

  // CORS por allow-list. Aceita `CORS_ORIGINS` (lista por vírgulas).
  // Em produção, `*` é explicitamente rejeitado.
  const rawOrigins = (process.env.CORS_ORIGINS ?? '*')
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean);
  const isProd = process.env.NODE_ENV === 'production';
  const isWildcardOnly =
    rawOrigins.length === 1 && rawOrigins[0] === '*';
  if (isProd && isWildcardOnly) {
    throw new Error(
      'CORS_ORIGINS="*" é proibido em produção. Defina uma lista de origens confiáveis.',
    );
  }

  app.enableCors({
    origin: isWildcardOnly ? true : rawOrigins,
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
      disableErrorMessages: isProd,
    }),
  );

  app.useGlobalFilters(new HttpExceptionFilter());

  const swaggerConfig = new DocumentBuilder()
    .setTitle('Ford Brasil Vehicle Catalog & Dealership API')
    .setDescription(
      [
        'API profissional para consulta de veículos Ford Brasil e gestão da concessionária.',
        '',
        'Inclui: autenticação JWT (RBAC), gestão de colaboradores, clientes, estoque, leads, financiamentos,',
        'ordens de serviço, técnicos, metas, avaliações (públicas) e dashboard agregado.',
        '',
        'Camadas de segurança: Helmet, CORS configurável, ThrottlerGuard global, JwtAuthGuard global,',
        'ValidationPipe global, HttpExceptionFilter padronizado, LoggingMiddleware + AuditInterceptor,',
        'AES-256-GCM e HMAC-SHA256 disponíveis para dados sensíveis.',
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
    .addTag('Auth', 'Autenticação JWT, login e registro de colaboradores')
    .addTag('Colaboradores', 'CRUD de colaboradores e gestão de papéis')
    .addTag('Clientes', 'CRUD de clientes da concessionária')
    .addTag('Estoque', 'CRUD de veículos em estoque')
    .addTag('Leads', 'Pipeline de leads inteligentes')
    .addTag('Financiamentos', 'Carteira de financiamentos')
    .addTag('Servicos', 'Ordens de serviço (oficina)')
    .addTag('Tecnicos', 'Equipe técnica da oficina')
    .addTag('Metas', 'Metas e indicadores comerciais')
    .addTag('Avaliacoes', 'Avaliações de clientes (endpoints públicos)')
    .addTag('Dashboard', 'KPIs agregados em tempo real')
    .addTag('Health', 'Health check do serviço')
    .addTag('Vehicles', 'Catálogo Ford (scrapping)')
    .addTag('Scrapper', 'Disparo manual do scraping (autenticado)')
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
