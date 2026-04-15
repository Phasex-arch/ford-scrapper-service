import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module.js';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import { Logger } from '@nestjs/common';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  const logger = new Logger('Bootstrap');

  // Global API prefix
  app.setGlobalPrefix('api/v1');

  // CORS
  app.enableCors({
    origin: '*',
    methods: 'GET,HEAD,PUT,PATCH,POST,DELETE',
    allowedHeaders: 'Content-Type,Authorization',
  });

  // Swagger / OpenAPI documentation
  const swaggerConfig = new DocumentBuilder()
    .setTitle('Ford Brasil Vehicle Catalog API')
    .setDescription(
      'API profissional para consulta de veículos Ford Brasil. ' +
      'Dados coletados e normalizados exclusivamente a partir de fontes oficiais (ford.com.br).',
    )
    .setVersion('1.0.0')
    .addTag('Health', 'Health check do serviço')
    .addTag('Vehicles', 'Consulta, filtro, categorias, cores, modelos, versões, busca, fontes e estatísticas de veículos')
    .addTag('Sync', 'Sincronização de dados com o site oficial')
    .build();

  const document = SwaggerModule.createDocument(app, swaggerConfig);
  SwaggerModule.setup('api/docs', app, document);

  const port = process.env.PORT ?? 3000;
  await app.listen(port);
  logger.log(`Application running on http://localhost:${port}`);
  logger.log(`Swagger docs available at http://localhost:${port}/api/docs`);
}
bootstrap();
