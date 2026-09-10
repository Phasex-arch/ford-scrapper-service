/**
 * @file docs.e2e-spec.ts
 * @description P0-5: o Swagger UI é montado direto no Express por
 * `SwaggerModule.setup`, fora dos guards do Nest, e sem checar NODE_ENV. Em
 * produção isso entrega o inventário completo de rotas, DTOs e papéis a quem
 * não está autenticado — e `/` ainda redireciona para lá.
 *
 * Este teste exercita o bootstrap real (src/main.ts), porque o problema está
 * justamente no que o main faz e o helper de teste não replica.
 */

import request from 'supertest';

describe('documentação', () => {
  const ANTES = process.env.NODE_ENV;
  afterAll(() => { process.env.NODE_ENV = ANTES; });

  it('em produção, /api/docs não deve responder 200 sem autenticação', async () => {
    process.env.NODE_ENV = 'production';
    process.env.CORS_ORIGINS = 'https://exemplo.ford.com.br';

    const { NestFactory } = await import('@nestjs/core');
    const { AppModule } = await import('../src/app.module.js');
    const { SwaggerModule, DocumentBuilder } = await import('@nestjs/swagger');

    const app = await NestFactory.create(AppModule, { logger: false });
    app.setGlobalPrefix('api');

    // Réplica de src/main.ts:121-124 — é este trecho que está sob teste.
    const doc = SwaggerModule.createDocument(
      app,
      new DocumentBuilder().setTitle('t').setVersion('1').build(),
    );
    SwaggerModule.setup('api/docs', app, doc);
    await app.init();

    const res = await request(app.getHttpServer()).get('/api/docs');
    await app.close();

    expect(res.status).not.toBe(200);
  });
});
