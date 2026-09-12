import {
  BadRequestException,
  Controller,
  Get,
  Logger,
  NotFoundException,
  Param,
  Query,
} from '@nestjs/common';
import {
  ApiOperation,
  ApiParam,
  ApiQuery,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';
import { VehicleService } from '../application/vehicle/vehicle.service.js';
import {
  mapVehicleToResponse,
  buildPaginationMeta,
} from '../application/dto/vehicle-response.dto.js';
import { VehicleFilterDto } from '../application/dto/vehicle-filter.dto.js';
import { stripXss } from '../../common/sanitizers/string.sanitizer.js';

const SLUG_RE = /^[a-z0-9-]{1,80}$/;
const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

@ApiTags('Vehicles')
@Controller('vehicles')
export class VehicleController {
  private readonly logger = new Logger(VehicleController.name);

  constructor(private readonly vehicleService: VehicleService) {}

  @Get()
  @ApiOperation({
    summary: 'List all vehicles with optional filters, pagination and sorting',
  })
  @ApiResponse({
    status: 200,
    description: 'Paginated vehicle list with filters applied',
  })
  async findAll(@Query() filters: VehicleFilterDto) {
    const page = filters.page ?? 1;
    const limit = filters.limit ?? 20;
    const effective = { ...filters, page, limit };

    this.logger.log(`GET /vehicles — filtered query`);

    const [vehicles, total] = await Promise.all([
      this.vehicleService.findWithFilters(effective),
      this.vehicleService.countWithFilters(effective),
    ]);

    const pagination = buildPaginationMeta(total, page, limit);

    return {
      brand: 'Ford',
      market: 'Brasil',
      collected_at: new Date().toISOString(),
      source: 'https://www.ford.com.br/',
      pagination,
      vehicles: vehicles.map(mapVehicleToResponse),
    };
  }

  @Get('categories')
  @ApiOperation({ summary: 'List all distinct vehicle categories with count' })
  @ApiResponse({ status: 200, description: 'List of categories' })
  async findAllCategories() {
    this.logger.log('GET /vehicles/categories');
    const categories = await this.vehicleService.findDistinctCategories();

    return {
      total: categories.length,
      categories: categories.map((c) => ({
        nome: c.categoria_principal,
        total_veiculos: c.count,
      })),
    };
  }

  @Get('colors')
  @ApiOperation({ summary: 'List all distinct vehicle colors with count' })
  @ApiResponse({ status: 200, description: 'List of colors' })
  async findAllColors() {
    this.logger.log('GET /vehicles/colors');
    const colors = await this.vehicleService.findDistinctColors();

    return {
      total: colors.length,
      cores: colors.map((c) => ({
        nome: c.nome,
        total_veiculos: c.count,
      })),
    };
  }

  @Get('models')
  @ApiOperation({
    summary: 'List all distinct vehicle models with family and count',
  })
  @ApiResponse({ status: 200, description: 'List of models' })
  async findAllModels() {
    this.logger.log('GET /vehicles/models');
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

  @Get('versions')
  @ApiOperation({
    summary: 'List all distinct vehicle versions with model reference',
  })
  @ApiResponse({ status: 200, description: 'List of versions' })
  async findAllVersions() {
    this.logger.log('GET /vehicles/versions');
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

  @Get('search')
  @ApiOperation({
    summary: 'Search vehicles by text query across multiple fields',
  })
  @ApiQuery({ name: 'q', required: true, description: 'Search query text' })
  @ApiQuery({
    name: 'page',
    required: false,
    type: Number,
    description: 'Page number (default: 1)',
  })
  @ApiQuery({
    name: 'limit',
    required: false,
    type: Number,
    description: 'Items per page (default: 20)',
  })
  @ApiResponse({ status: 200, description: 'Search results with pagination' })
  @ApiResponse({ status: 400, description: 'Missing or invalid query parameter' })
  async search(
    @Query('q') q?: string,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
  ) {
    if (!q || q.trim().length === 0) {
      throw new BadRequestException('Query parameter "q" is required');
    }
    if (q.length > 60) {
      throw new BadRequestException('Query parameter "q" too long');
    }

    const sanitized = stripXss(q).trim();
    const pageNum = page ? Math.max(1, Math.min(parseInt(page, 10) || 1, 10_000)) : 1;
    const limitNum = limit
      ? Math.max(1, Math.min(parseInt(limit, 10) || 20, 100))
      : 20;

    this.logger.log(
      `GET /vehicles/search page=${pageNum} limit=${limitNum}`,
    );

    const [vehicles, total] = await Promise.all([
      this.vehicleService.search(sanitized, pageNum, limitNum),
      this.vehicleService.searchCount(sanitized),
    ]);

    const pagination = buildPaginationMeta(total, pageNum, limitNum);

    return {
      query: sanitized,
      pagination,
      vehicles: vehicles.map(mapVehicleToResponse),
    };
  }

  @Get('sources')
  @ApiOperation({
    summary: 'List all official sources used for vehicle data collection',
  })
  @ApiResponse({ status: 200, description: 'List of source URLs' })
  async findAllSources() {
    this.logger.log('GET /vehicles/sources');
    const sources = await this.vehicleService.getAllSources();

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

  @Get('stats')
  @ApiOperation({
    summary: 'Get aggregated statistics about the vehicle catalog',
  })
  @ApiResponse({ status: 200, description: 'Catalog statistics' })
  async getStats() {
    this.logger.log('GET /vehicles/stats');
    const stats = await this.vehicleService.getStats();

    return {
      brand: 'Ford',
      market: 'Brasil',
      generated_at: new Date().toISOString(),
      ...stats,
    };
  }

  @Get(':identifier')
  @ApiOperation({ summary: 'Get a vehicle by UUID or slug' })
  @ApiParam({
    name: 'identifier',
    description: 'Vehicle UUID or slug',
    example: '8d3e0b8a-4e38-4d1b-9f6a-123456789abc',
  })
  @ApiResponse({ status: 200, description: 'Vehicle details' })
  @ApiResponse({ status: 404, description: 'Vehicle not found' })
  async findOne(@Param('identifier') identifier: string) {
    if (!UUID_RE.test(identifier) && !SLUG_RE.test(identifier)) {
      throw new BadRequestException(
        'identifier deve ser um UUID ou slug válido',
      );
    }
    this.logger.log(`GET /vehicles/${identifier}`);

    let vehicle = UUID_RE.test(identifier)
      ? await this.vehicleService.findById(identifier)
      : null;
    if (!vehicle) {
      vehicle = await this.vehicleService.findBySlug(identifier);
    }
    if (!vehicle) {
      throw new NotFoundException(`Vehicle not found: ${identifier}`);
    }

    return mapVehicleToResponse(vehicle);
  }
}
