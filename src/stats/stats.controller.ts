import { Controller, Get, Logger } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse } from '@nestjs/swagger';
import { VehicleService } from '../vehicle/application/vehicle/vehicle.service.js';

@ApiTags('Stats')
@Controller('stats')
export class StatsController {
  private readonly logger = new Logger(StatsController.name);

  constructor(private readonly vehicleService: VehicleService) {}

  @Get()
  @ApiOperation({ summary: 'Get aggregated statistics about the vehicle catalog' })
  @ApiResponse({ status: 200, description: 'Catalog statistics' })
  async getStats() {
    this.logger.log('GET /stats');
    const stats = await this.vehicleService.getStats();

    return {
      brand: 'Ford',
      market: 'Brasil',
      generated_at: new Date().toISOString(),
      ...stats,
    };
  }
}
