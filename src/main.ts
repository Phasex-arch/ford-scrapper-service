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
 * - Em produção, recusa subir com CORS_ORIGINS="*" ou JWT_SECRET fraco/placeholder.
 */
async function bootstrap() {
  const app = await NestFactory.create(AppModule, { bodyParser: true });
  const logger = new Logger('Bootstrap');

  // Redirecionamento amigável de / e /api para a documentação Swagger
  const expressApp = app.getHttpAdapter().getInstance();
  expressApp.get(['/', '/api'], (_req: any, res: any) => res.redirect('/api/docs'));
  expressApp.get('/favicon.ico', (_req: any, res: any) => res.status(204).end());

  app.setGlobalPrefix('api');

  // Trust o primeiro reverse proxy (TLS terminator) para X-Forwarded-*.
  expressApp.set('trust proxy', 1);

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

  // JWT_SECRET fraco ou igual ao placeholder do .env.example nunca pode
  // subir em produção — só é validado presença/tamanho aqui; auth.module.ts
  // e jwt.strategy.ts já recusam subir sem JWT_SECRET em qualquer ambiente.
  const jwtSecret = process.env.JWT_SECRET ?? '';
  const isPlaceholderSecret =
    jwtSecret === 'change-me-super-secret-with-at-least-32-chars';
  if (isProd && (isPlaceholderSecret || jwtSecret.length < 32)) {
    throw new Error(
      'JWT_SECRET fraco ou igual ao valor de exemplo do .env.example. ' +
        'Gere um valor aleatório com pelo menos 32 caracteres antes de subir em produção.',
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
    .setTitle('API Ford Brasil — Catálogo de veículos e concessionária')
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
    .addTag('Autenticação', 'Autenticação JWT e dados do usuário autenticado')
    .addTag('Colaboradores', 'CRUD de colaboradores e gestão de papéis')
    .addTag('Clientes', 'CRUD de clientes da concessionária')
    .addTag('Estoque', 'CRUD de veículos em estoque')
    .addTag('Histórico de veículos', 'Veículos adquiridos por cada cliente (posse atual e anteriores)')
    .addTag('Leads', 'Pipeline de leads inteligentes')
    .addTag('Financiamentos', 'Carteira de financiamentos')
    .addTag('Serviços', 'Ordens de serviço da oficina')
    .addTag('Técnicos', 'Equipe técnica da oficina')
    .addTag('Metas', 'Metas e indicadores comerciais')
    .addTag('Avaliações', 'Avaliações de clientes e endpoints públicos')
    .addTag('Dashboard', 'KPIs agregados em tempo real')
    .addTag('Saúde', 'Verificação de saúde do serviço')
    .addTag('Veículos', 'Catálogo Ford e dados coletados')
    .addTag('Sincronização', 'Sincronização manual de dados (autenticada)')
    .addTag('Coleta de dados', 'Coleta de dados do catálogo Ford')
    .addTag('Contato público', 'Recebimento de contatos e leads públicos')
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
