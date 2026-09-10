import { Injectable, Logger } from '@nestjs/common';
import { HttpAdapterHost } from '@nestjs/core';
import type { Express, NextFunction, Request, Response } from 'express';

/**
 * P0-5: `SwaggerModule.setup` monta o Swagger UI direto no Express, fora do
 * `JwtAuthGuard` e do `ThrottlerGuard`. Em producao isso entrega o inventario
 * completo de rotas, DTOs e papeis a quem nao esta autenticado.
 *
 * `src/main.ts` ja deixa de montar a documentacao em producao, mas qualquer
 * outro bootstrap (script, teste, deploy alternativo) pode chamar `setup` de
 * novo e reabrir o buraco. Este provider fecha a porta no unico ponto em que
 * isso e possivel: o middleware e registrado no construtor, durante
 * `NestFactory.create`, portanto ANTES de qualquer `SwaggerModule.setup`
 * chamado pelo bootstrap — e no Express quem registra primeiro responde
 * primeiro.
 */
const PREFIXO_DOCS = '/api/docs';

@Injectable()
export class ProductionDocsBlocker {
  private readonly logger = new Logger(ProductionDocsBlocker.name);

  constructor(adapterHost: HttpAdapterHost) {
    if (process.env.NODE_ENV !== 'production') return;

    const instance = adapterHost.httpAdapter?.getInstance<Express>();
    if (typeof instance?.use !== 'function') return;

    instance.use((req: Request, res: Response, next: NextFunction) => {
      // Cobre /api/docs, /api/docs/*, /api/docs-json e /api/docs-yaml.
      if (!req.path.startsWith(PREFIXO_DOCS)) return next();
      res.status(404).json({
        statusCode: 404,
        message: 'Documentacao indisponivel neste ambiente',
        error: 'NotFoundException',
        path: req.originalUrl,
        timestamp: new Date().toISOString(),
      });
    });

    this.logger.log('NODE_ENV=production: documentacao OpenAPI bloqueada');
  }
}
