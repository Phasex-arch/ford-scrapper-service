import {
  Controller,
  Get,
  Param,
  Query,
  NotFoundException,
  Logger,
  ParseUUIDPipe,
  Delete,
  HttpCode,
  HttpStatus,
  BadRequestException,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiParam, ApiResponse } from '@nestjs/swagger';
import { VehicleService } from '../application/vehicle/vehicle.service.js';
import {
  mapVehicleToResponse,
  buildPaginationMeta,
} from '../application/dto/vehicle-response.dto.js';
import { VehicleFilterDto } from '../application/dto/vehicle-filter.dto.js';
import { Roles } from '../../common/decorators/roles.decorator.js';
import { Role } from '../../common/enums/role.enum.js';

const SLUG_RE = /^[a-z0-9-]{1,80}$/;

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

  @Get(':id')
  @ApiOperation({ summary: 'Get a vehicle by UUID or slug' })
  @ApiParam({ name: 'id', description: 'Vehicle UUID or slug' })
  @ApiResponse({ status: 200, description: 'Vehicle details' })
  @ApiResponse({ status: 404, description: 'Vehicle not found' })
  async findOne(@Param('id') id: string) {
    if (!this.isUuid(id) && !SLUG_RE.test(id)) {
      throw new BadRequestException('id deve ser um UUID ou slug válido');
    }
    this.logger.log(`GET /vehicles/${id}`);

    let vehicle = this.isUuid(id)
      ? await this.vehicleService.findById(id)
      : null;
    if (!vehicle) {
      vehicle = await this.vehicleService.findBySlug(id);
    }
    if (!vehicle) {
      throw new NotFoundException(`Vehicle not found: ${id}`);
    }

    return mapVehicleToResponse(vehicle);
  }

  @Delete(':id')
  @Roles(Role.ADMIN)
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Delete a vehicle (ADMIN only, audited)' })
  async remove(@Param('id', new ParseUUIDPipe()) id: string) {
    this.logger.log(`DELETE /vehicles/${id}`);
    await this.vehicleService.delete(id);
  }

  private isUuid(value: string): boolean {
    return /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(
      value,
    );
  }
}
