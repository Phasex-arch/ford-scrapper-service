import { Controller, Get, Logger } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse } from '@nestjs/swagger';
import { VehicleService } from '../vehicle/application/vehicle/vehicle.service.js';

@ApiTags('Versions')
@Controller('versions')
export class VersionsController {
  private readonly logger = new Logger(VersionsController.name);

  constructor(private readonly vehicleService: VehicleService) {}

  @Get()
  @ApiOperation({ summary: 'List all distinct vehicle versions with model reference' })
  @ApiResponse({ status: 200, description: 'List of versions' })
  async findAll() {
    this.logger.log('GET /versions');
    const versions = await this.vehicleService.findDistinctVersions();

    return {
      total: versions.length,
      versoes: versions.map((v) => ({
        versao: v.versao,
        modelo: v.modelo,
        total_veiculos: v.count,
      })),
    };
  }
}
