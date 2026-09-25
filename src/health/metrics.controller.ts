import {
  Controller,
  Get,
  Headers,
  NotFoundException,
  Res,
  UnauthorizedException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { ApiExcludeController } from '@nestjs/swagger';
import type { Response } from 'express';
import { createHash, timingSafeEqual } from 'node:crypto';
import { Public } from '../auth/infrastructure/decorators/public.decorator.js';
import { MetricsService } from '../common/metrics/metrics.service.js';

/**
 * Endpoint de scrape do Prometheus. Não usa o JWT dos usuários (o Prometheus
 * não faz login): exige `Authorization: Bearer $METRICS_TOKEN`. Sem
 * METRICS_TOKEN configurado o endpoint nem existe (404) — métricas expõem
 * rotas, volume e eventos de segurança, não podem ficar abertas.
 */
@ApiExcludeController()
@Controller('metrics')
export class MetricsController {
  constructor(
    private readonly metrics: MetricsService,
    private readonly config: ConfigService,
  ) {}

  @Public()
  @Get()
  async scrape(
    @Headers('authorization') authorization: string | undefined,
    @Res({ passthrough: true }) res: Response,
  ): Promise<string> {
    const token = this.config.get<string>('METRICS_TOKEN');
    if (!token) throw new NotFoundException();
    if (!sameSecret(authorization ?? '', `Bearer ${token}`)) {
      throw new UnauthorizedException('Token de métricas inválido');
    }
    res.setHeader('Content-Type', this.metrics.registry.contentType);
    return this.metrics.registry.metrics();
  }
}

/** Comparação em tempo constante (hash antes para igualar os tamanhos). */
function sameSecret(a: string, b: string): boolean {
  const digest = (s: string) => createHash('sha256').update(s).digest();
  return timingSafeEqual(digest(a), digest(b));
}
