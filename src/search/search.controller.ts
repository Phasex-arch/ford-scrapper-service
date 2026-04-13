import { Controller, Get, Query, Logger, BadRequestException } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiQuery, ApiResponse } from '@nestjs/swagger';
import { VehicleService } from '../vehicle/application/vehicle/vehicle.service.js';
import {
  mapVehicleToResponse,
  buildPaginationMeta,
} from '../vehicle/application/dto/vehicle-response.dto.js';

@ApiTags('Search')
@Controller('search')
export class SearchController {
  private readonly logger = new Logger(SearchController.name);

  constructor(private readonly vehicleService: VehicleService) {}

  @Get()
  @ApiOperation({ summary: 'Search vehicles by text query across multiple fields' })
  @ApiQuery({ name: 'q', required: true, description: 'Search query text' })
  @ApiQuery({ name: 'page', required: false, type: Number, description: 'Page number (default: 1)' })
  @ApiQuery({ name: 'limit', required: false, type: Number, description: 'Items per page (default: 20)' })
  @ApiResponse({ status: 200, description: 'Search results with pagination' })
  @ApiResponse({ status: 400, description: 'Missing query parameter' })
  async search(
    @Query('q') q?: string,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
  ) {
    if (!q || q.trim().length === 0) {
      throw new BadRequestException('Query parameter "q" is required');
    }

    const pageNum = page ? parseInt(page, 10) : 1;
    const limitNum = limit ? Math.min(parseInt(limit, 10), 100) : 20;

    this.logger.log(`GET /search?q=${q}&page=${pageNum}&limit=${limitNum}`);

    const [vehicles, total] = await Promise.all([
      this.vehicleService.search(q.trim(), pageNum, limitNum),
      this.vehicleService.searchCount(q.trim()),
    ]);

    const pagination = buildPaginationMeta(total, pageNum, limitNum);

    return {
      query: q.trim(),
      pagination,
      vehicles: vehicles.map(mapVehicleToResponse),
    };
  }
}
