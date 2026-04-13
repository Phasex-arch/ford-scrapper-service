import { Controller, Get, Logger } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse } from '@nestjs/swagger';
import { VehicleService } from '../vehicle/application/vehicle/vehicle.service.js';

@ApiTags('Models')
@Controller('models')
export class ModelsController {
  private readonly logger = new Logger(ModelsController.name);

  constructor(private readonly vehicleService: VehicleService) {}

  @Get()
  @ApiOperation({ summary: 'List all distinct vehicle models with family and count' })
  @ApiResponse({ status: 200, description: 'List of models' })
  async findAll() {
    this.logger.log('GET /models');
    const models = await this.vehicleService.findDistinctModels();

    return {
      total: models.length,
      modelos: models.map((m) => ({
        modelo: m.modelo,
        familia: m.familia,
        total_versoes: m.count,
      })),
    };
  }
}
