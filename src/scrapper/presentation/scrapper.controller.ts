import { Controller, Get, Logger, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import { Throttle } from '@nestjs/throttler';
import { Role } from '../../../generated/prisma/enums.js';
import { Roles } from '../../auth/infrastructure/decorators/roles.decorator.js';
import { RolesGuard } from '../../auth/infrastructure/guards/roles.guard.js';
import { ScrapperService } from '../application/scrapper.js';
import type { FordCatalogResponse } from '../domain/scrapped-info.js';

/**
 * Endpoints administrativos do scraper.
 * Restrito a ADMIN/GERENTE — dispara scraping ao vivo (custo de IA, risco
 * de bloqueio de IP pela Ford), não é algo que qualquer FUNCIONARIO deveria
 * poder acionar. Throttle evita disparos repetidos acidentais/abusivos.
 */
@ApiTags('Coleta de dados')
@ApiBearerAuth('JWT')
@Controller('scrapper')
@UseGuards(RolesGuard)
export class ScrapperController {
  private readonly logger = new Logger(ScrapperController.name);

  constructor(private readonly scrapperService: ScrapperService) {}

  @Get('ford')
  @Roles(Role.ADMIN, Role.GERENTE)
  @Throttle({ default: { limit: 1, ttl: 300_000 } })
  @ApiOperation({
    summary: 'Dispara o scraping da Ford e devolve o catálogo coletado',
    description: 'Restrito a ADMIN/GERENTE. Limitado a 1 requisição a cada 5 minutos.',
  })
  @ApiResponse({ status: 429, description: 'Limite de requisições excedido' })
  async scrapeFord(): Promise<FordCatalogResponse> {
    this.logger.log('Ford scraping triggered via GET /scrapper/ford');
    const start = Date.now();
    const result = await this.scrapperService.scrapeAll();
    const elapsed = ((Date.now() - start) / 1000).toFixed(1);
    this.logger.log(
      `Scraping completed in ${elapsed}s — ${result.vehicles.length} vehicle(s) collected`,
    );
    return result;
  }
}
