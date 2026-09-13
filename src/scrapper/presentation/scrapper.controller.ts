import { Controller, Get, Logger } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { ScrapperService } from '../application/scrapper.js';
import type { FordCatalogResponse } from '../domain/scrapped-info.js';

/**
 * Endpoints administrativos do scraper.
 * Toda rota fica protegida pelo `JwtAuthGuard` global; clientes precisam
 * apresentar `Authorization: Bearer <token>` para disparar uma coleta.
 *
 * Para persistir o catálogo coletado no banco, use `POST /api/sync`
 * (módulo `vehicle/sync`) — ele cria um `SyncRun` com histórico e devolve
 * um resumo da execução. Esta rota apenas coleta e retorna, sem gravar nada.
 */
@ApiTags('Coleta de dados')
@ApiBearerAuth('JWT')
@Controller('scrapper')
export class ScrapperController {
  private readonly logger = new Logger(ScrapperController.name);

  constructor(private readonly scrapperService: ScrapperService) {}

  @Get('ford')
  @ApiOperation({
    summary: 'Dispara o scraping da Ford e devolve o catálogo coletado',
  })
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
