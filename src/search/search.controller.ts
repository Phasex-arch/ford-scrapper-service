import { Controller, Get, Logger, Query } from '@nestjs/common';
import { ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import { VehicleService } from '../vehicle/application/vehicle/vehicle.service.js';
import {
  buildPaginationMeta,
  mapVehicleToResponse,
} from '../vehicle/application/dto/vehicle-response.dto.js';
import { SearchQueryDto } from './dto/search-query.dto.js';
import { stripXss } from '../common/sanitizers/string.sanitizer.js';

@ApiTags('Search')
@Controller('search')
export class SearchController {
  private readonly logger = new Logger(SearchController.name);

  constructor(private readonly vehicleService: VehicleService) {}

  @Get()
  @ApiOperation({
    summary: 'Search vehicles by text query across multiple fields',
  })
  @ApiResponse({ status: 200, description: 'Search results with pagination' })
  @ApiResponse({
    status: 400,
    description: 'Missing or invalid query parameter',
  })
  async search(@Query() query: SearchQueryDto) {
    const sanitized = stripXss(query.q).trim();
    const page = query.page ?? 1;
    const limit = query.limit ?? 20;

    this.logger.log(`GET /search?q=<redacted>&page=${page}&limit=${limit}`);

    const [vehicles, total] = await Promise.all([
      this.vehicleService.search(sanitized, page, limit),
      this.vehicleService.searchCount(sanitized),
    ]);
    const pagination = buildPaginationMeta(total, page, limit);

    return {
      query: sanitized,
      pagination,
      vehicles: vehicles.map(mapVehicleToResponse),
    };
  }
}
