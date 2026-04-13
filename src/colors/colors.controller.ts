import { Controller, Get, Logger } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse } from '@nestjs/swagger';
import { VehicleService } from '../vehicle/application/vehicle/vehicle.service.js';

@ApiTags('Colors')
@Controller('colors')
export class ColorsController {
  private readonly logger = new Logger(ColorsController.name);

  constructor(private readonly vehicleService: VehicleService) {}

  @Get()
  @ApiOperation({ summary: 'List all distinct vehicle colors with count' })
  @ApiResponse({ status: 200, description: 'List of colors' })
  async findAll() {
    this.logger.log('GET /colors');
    const colors = await this.vehicleService.findDistinctColors();

    return {
      total: colors.length,
      cores: colors.map((c) => ({
        nome: c.nome,
        total_veiculos: c.count,
      })),
    };
  }
}
