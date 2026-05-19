import { Controller, Get, Logger } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse } from '@nestjs/swagger';
import { VehicleService } from '../vehicle/application/vehicle/vehicle.service.js';

@ApiTags('Sources')
@Controller('sources')
export class SourcesController {
  private readonly logger = new Logger(SourcesController.name);

  constructor(private readonly vehicleService: VehicleService) {}

  @Get()
  @ApiOperation({
    summary: 'List all official sources used for vehicle data collection',
  })
  @ApiResponse({ status: 200, description: 'List of source URLs' })
  async findAll() {
    this.logger.log('GET /sources');
    const sources = await this.vehicleService.getAllSources();

    // Deduplicate by modelo_url
    const uniqueSources = new Map<string, (typeof sources)[0]>();
    for (const source of sources) {
      if (!uniqueSources.has(source.modelo_url)) {
        uniqueSources.set(source.modelo_url, source);
      }
    }

    return {
      total: uniqueSources.size,
      base_url: 'https://www.ford.com.br/',
      fontes: [...uniqueSources.values()].map((s) => ({
        modelo_url: s.modelo_url,
        versao_url: s.versao_url,
        ficha_tecnica_url: s.ficha_tecnica_url,
        cores_url: s.cores_url,
      })),
    };
  }
}
