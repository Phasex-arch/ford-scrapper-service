import { Controller, Get, Logger } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse } from '@nestjs/swagger';
import { VehicleService } from '../vehicle/application/vehicle/vehicle.service.js';

@ApiTags('Categories')
@Controller('categories')
export class CategoriesController {
  private readonly logger = new Logger(CategoriesController.name);

  constructor(private readonly vehicleService: VehicleService) {}

  @Get()
  @ApiOperation({ summary: 'List all distinct vehicle categories with count' })
  @ApiResponse({ status: 200, description: 'List of categories' })
  async findAll() {
    this.logger.log('GET /categories');
    const categories = await this.vehicleService.findDistinctCategories();

    return {
      total: categories.length,
      categories: categories.map((c) => ({
        nome: c.categoria_principal,
        total_veiculos: c.count,
      })),
    };
  }
}
