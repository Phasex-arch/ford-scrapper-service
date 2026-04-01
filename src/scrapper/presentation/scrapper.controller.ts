import { Controller, Get, Logger } from '@nestjs/common';
import { ScrapperService } from '../application/scrapper.js';
import type { FordCatalogResponse } from '../domain/scrapped-info.js';

@Controller('scrapper')
export class ScrapperController {
  private readonly logger = new Logger(ScrapperController.name);

  constructor(private readonly scrapperService: ScrapperService) {}

  @Get('ford')
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
