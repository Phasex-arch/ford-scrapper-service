import { Controller, Get, Logger, Post } from '@nestjs/common';
import { ScrapperService } from '../application/scrapper.js';
import type { FordCatalogResponse } from '../domain/scrapped-info.js';
import { VehicleService } from '../../vehicle/application/vehicle/vehicle.service.js';
import { mapVehicleInfoToDto } from '../../vehicle/application/mappers/vehicle-info.mapper.js';

@Controller('scrapper')
export class ScrapperController {
  private readonly logger = new Logger(ScrapperController.name);

  constructor(
    private readonly scrapperService: ScrapperService,
    private readonly vehicleService: VehicleService,
  ) {}

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

  @Post('ford')
  async syncDataFromScrapper(): Promise<void> {
    this.logger.log('Syncing data from scrapper');
    const result = await this.scrapperService.scrapeAll();
    for (const vehicleInfo of result.vehicles) {
      const dto = mapVehicleInfoToDto(vehicleInfo);
      await this.vehicleService.save(dto);
    }
  }
}
