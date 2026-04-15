import { Controller, Get, Param, Query, NotFoundException, BadRequestException, Logger } from '@nestjs/common';
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
  @ApiOperation({ summary: 'List all distinct vehicle models with family and count' })
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
  @ApiOperation({ summary: 'List all distinct vehicle versions with model reference' })
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

    this.logger.log(`GET /vehicles/search?q=${q}&page=${pageNum}&limit=${limitNum}`);

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

  @Get('sources')
  @ApiOperation({ summary: 'List all official sources used for vehicle data collection' })
  @ApiResponse({ status: 200, description: 'List of source URLs' })
  async findAllSources() {
    this.logger.log('GET /vehicles/sources');
    const sources = await this.vehicleService.getAllSources();

    const uniqueSources = new Map<string, typeof sources[0]>();
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
  @ApiOperation({ summary: 'Get aggregated statistics about the vehicle catalog' })
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

  @Get(':id')
  @ApiOperation({ summary: 'Get a vehicle by ID or slug' })
  @ApiParam({ name: 'id', description: 'Vehicle UUID or slug' })
  @ApiResponse({ status: 200, description: 'Vehicle details' })
  @ApiResponse({ status: 404, description: 'Vehicle not found' })
  async findOne(@Param('id') id: string) {
    this.logger.log(`GET /vehicles/${id}`);

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
