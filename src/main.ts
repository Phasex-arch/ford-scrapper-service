import { NestFactory } from '@nestjs/core';
import { Logger, ValidationPipe } from '@nestjs/common';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import { Logger as PinoNestLogger } from 'nestjs-pino';
import helmet from 'helmet';
import { json, urlencoded } from 'express';
import { AppModule } from './app.module.js';
import { AllExceptionsFilter } from './common/filters/all-exceptions.filter.js';

async function bootstrap() {
  const app = await NestFactory.create(AppModule, {
    bufferLogs: true,
  });
  const logger = new Logger('Bootstrap');

  app.useLogger(app.get(PinoNestLogger));

  // Trust the first reverse proxy (Nginx / Traefik) for X-Forwarded-* headers.
  // Required so rate limiter and audit logs see the real client IP after TLS termination.
  const httpAdapter = app.getHttpAdapter();
  const expressInstance = httpAdapter.getInstance() as unknown as {
    set: (k: string, v: unknown) => void;
  };
  expressInstance.set('trust proxy', 1);

  // Payload size cap (slide 8) — defeats buffer-flooding payloads.
  app.use(json({ limit: '10kb' }));
  app.use(urlencoded({ limit: '10kb', extended: true }));

  // Security headers / HSTS / no X-Powered-By (slide 15).
  app.use(
    helmet({
      contentSecurityPolicy: false,
      crossOriginEmbedderPolicy: false,
    }),
  );

  app.setGlobalPrefix('api/v1');

  // Strict CORS by allowlist (slide 17 — "nunca use *").
  const rawOrigins = process.env.CORS_ALLOWED_ORIGINS ?? '';
  const allowList = rawOrigins
    .split(',')
    .map((o) => o.trim())
    .filter(Boolean);
  if (allowList.includes('*')) {
    throw new Error(
      'CORS_ALLOWED_ORIGINS contains "*", which is forbidden. ' +
        'Provide a comma-separated list of fully-qualified origins.',
    );
  }
  type CorsCallback = (err: Error | null, allow?: boolean) => void;
  app.enableCors({
    origin: (origin: string | undefined, callback: CorsCallback) => {
      if (!origin) {
        callback(null, true);
        return;
      }
      if (allowList.length === 0 || allowList.includes(origin)) {
        callback(null, true);
        return;
      }
      callback(new Error(`CORS: origin ${origin} not allowed`), false);
    },
    methods: 'GET,HEAD,PUT,PATCH,POST,DELETE,OPTIONS',
    allowedHeaders:
      'Content-Type,Authorization,Idempotency-Key,X-Signature,X-Signature-Timestamp,X-Trace-Id',
    credentials: true,
    maxAge: 600,
  });

  // Global validation (slide 5) — strips unknown properties, transforms types,
  // hides validation messages in production to avoid info disclosure.
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
      transformOptions: { enableImplicitConversion: true },
      disableErrorMessages: process.env.NODE_ENV === 'production',
    }),
  );

  // Global exception filter (slide 9) — generic envelope, no stack traces.
  app.useGlobalFilters(new AllExceptionsFilter());

  // Swagger
  const swaggerConfig = new DocumentBuilder()
    .setTitle('Ford Brasil Vehicle Catalog API')
    .setDescription(
      'API profissional para consulta de veículos Ford Brasil. ' +
        'Dados coletados e normalizados exclusivamente a partir de fontes oficiais (ford.com.br). ' +
        'Hardened conforme rubrica de Cybersecurity Sprint.',
    )
    .setVersion('1.1.0')
    .addBearerAuth({ type: 'http', scheme: 'bearer', bearerFormat: 'JWT' })
    .addTag('Health', 'Health check público')
    .addTag('Auth', 'Login, refresh e gerenciamento de sessão')
    .addTag('Vehicles', 'Consulta e filtro de veículos (autenticado)')
    .addTag('Leads', 'Cadastro e gestão de leads (PII criptografada)')
    .addTag('Audit', 'Trilha de auditoria e métricas (ADMIN)')
    .addTag('Categories', 'Categorias de veículos')
    .addTag('Colors', 'Cores disponíveis')
    .addTag('Models', 'Modelos de veículos')
    .addTag('Versions', 'Versões de veículos')
    .addTag('Search', 'Busca textual')
    .addTag('Sync', 'Sincronização de dados (ADMIN)')
    .addTag('Sources', 'Fontes oficiais utilizadas')
    .addTag('Stats', 'Estatísticas do catálogo (ANALISTA/ADMIN)')
    .build();

  const document = SwaggerModule.createDocument(app, swaggerConfig);
  SwaggerModule.setup('api/docs', app, document);

  const port = process.env.PORT ?? 3000;
  await app.listen(port);
  logger.log(`Application running on http://localhost:${port}`);
  logger.log(`Swagger docs available at http://localhost:${port}/api/docs`);
}
void bootstrap();
