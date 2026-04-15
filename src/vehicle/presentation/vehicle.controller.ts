import { Controller, Get, Param, Query, NotFoundException, Logger } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiQuery, ApiParam, ApiResponse } from '@nestjs/swagger';
import { VehicleService } from '../application/vehicle/vehicle.service.js';
import {
  mapVehicleToResponse,
  buildPaginationMeta,
} from '../application/dto/vehicle-response.dto.js';
import type { VehicleFilterDto } from '../application/dto/vehicle-filter.dto.js';

@ApiTags('Vehicles')
@Controller('vehicles')
export class VehicleController {
  private readonly logger = new Logger(VehicleController.name);

  constructor(private readonly vehicleService: VehicleService) {}

  @Get()
  @ApiOperation({ summary: 'List all vehicles with optional filters, pagination and sorting' })
  @ApiQuery({ name: 'categoria', required: false, description: 'Filter by main category' })
  @ApiQuery({ name: 'modelo', required: false, description: 'Filter by model name' })
  @ApiQuery({ name: 'versao', required: false, description: 'Filter by version name' })
  @ApiQuery({ name: 'cor', required: false, description: 'Filter by color name' })
  @ApiQuery({ name: 'tipo_veiculo', required: false, description: 'Filter by vehicle type' })
  @ApiQuery({ name: 'combustivel', required: false, description: 'Filter by fuel type' })
  @ApiQuery({ name: 'tracao', required: false, description: 'Filter by traction type' })
  @ApiQuery({ name: 'transmissao', required: false, description: 'Filter by transmission type' })
  @ApiQuery({ name: 'preco_min', required: false, type: Number, description: 'Minimum price' })
  @ApiQuery({ name: 'preco_max', required: false, type: Number, description: 'Maximum price' })
  @ApiQuery({
    name: 'sort',
    required: false,
    enum: ['preco_asc', 'preco_desc'],
    description: 'Sort order',
  })
  @ApiQuery({ name: 'page', required: false, type: Number, description: 'Page number (default: 1)' })
  @ApiQuery({ name: 'limit', required: false, type: Number, description: 'Items per page (default: 20)' })
  @ApiResponse({ status: 200, description: 'Paginated vehicle list with filters applied' })
  async findAll(
    @Query('categoria') categoria?: string,
    @Query('modelo') modelo?: string,
    @Query('versao') versao?: string,
    @Query('cor') cor?: string,
    @Query('tipo_veiculo') tipo_veiculo?: string,
    @Query('combustivel') combustivel?: string,
    @Query('tracao') tracao?: string,
    @Query('transmissao') transmissao?: string,
    @Query('preco_min') preco_min?: string,
    @Query('preco_max') preco_max?: string,
    @Query('sort') sort?: string,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
  ) {
    const filters: VehicleFilterDto = {
      categoria,
      modelo,
      versao,
      cor,
      tipo_veiculo,
      combustivel,
      tracao,
      transmissao,
      preco_min: preco_min ? parseFloat(preco_min) : undefined,
      preco_max: preco_max ? parseFloat(preco_max) : undefined,
      sort: sort as VehicleFilterDto['sort'],
      page: page ? parseInt(page, 10) : 1,
      limit: limit ? Math.min(parseInt(limit, 10), 100) : 20,
    };

    this.logger.log(`GET /vehicles — filters: ${JSON.stringify(filters)}`);

    const [vehicles, total] = await Promise.all([
      this.vehicleService.findWithFilters(filters),
      this.vehicleService.countWithFilters(filters),
    ]);

    const pagination = buildPaginationMeta(total, filters.page!, filters.limit!);

    return {
      brand: 'Ford',
      market: 'Brasil',
      collected_at: new Date().toISOString(),
      source: 'https://www.ford.com.br/',
      pagination,
      vehicles: vehicles.map(mapVehicleToResponse),
    };
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get a vehicle by ID or slug' })
  @ApiParam({ name: 'id', description: 'Vehicle UUID or slug' })
  @ApiResponse({ status: 200, description: 'Vehicle details' })
  @ApiResponse({ status: 404, description: 'Vehicle not found' })
  async findOne(@Param('id') id: string) {
    this.logger.log(`GET /vehicles/${id}`);

    // Try by UUID first, then by slug
    let vehicle = await this.vehicleService.findById(id);
    if (!vehicle) {
      vehicle = await this.vehicleService.findBySlug(id);
    }

    if (!vehicle) {
      throw new NotFoundException(`Vehicle not found: ${id}`);
    }

    return mapVehicleToResponse(vehicle);
  }
}
