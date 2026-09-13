import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
  Query,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiOperation,
  ApiParam,
  ApiQuery,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';
import { Role } from '../../../generated/prisma/enums.js';
import { Roles } from '../../auth/infrastructure/decorators/roles.decorator.js';
import { RolesGuard } from '../../auth/infrastructure/guards/roles.guard.js';
import { AuditInterceptor } from '../../common/interceptors/audit.interceptor.js';
import {
  buildPaginationMeta,
  PaginationQueryDto,
} from '../../common/dto/pagination.dto.js';
import { ColaboradorService } from '../application/colaborador.service.js';
import { CreateColaboradorDto } from '../application/dto/create-colaborador.dto.js';
import { UpdateColaboradorDto } from '../application/dto/update-colaborador.dto.js';
import {
  ColaboradorResponseDto,
  toColaboradorResponse,
} from '../application/dto/colaborador-response.dto.js';

@ApiTags('Colaboradores')
@ApiBearerAuth()
@Controller('colaboradores')
@UseGuards(RolesGuard)
@UseInterceptors(AuditInterceptor)
export class ColaboradorController {
  constructor(private readonly service: ColaboradorService) {}

  @Get()
  @Roles(Role.ADMIN, Role.GERENTE)
  @ApiOperation({ summary: 'Listar colaboradores (paginado)' })
  @ApiQuery({ name: 'ativo', required: false, type: Boolean })
  @ApiQuery({ name: 'role', required: false, enum: Role })
  @ApiQuery({ name: 'search', required: false })
  @ApiResponse({ status: 200, description: 'Lista paginada de colaboradores' })
  async list(
    @Query() pagination: PaginationQueryDto,
    @Query('ativo') ativo?: string,
    @Query('role') role?: Role,
    @Query('search') search?: string,
  ) {
    const page = pagination.page ?? 1;
    const limit = pagination.limit ?? 20;
    const ativoBool =
      ativo === undefined ? undefined : ativo === 'true' || ativo === '1';

    const { data, total } = await this.service.list({
      page,
      limit,
      ativo: ativoBool,
      role,
      search,
    });

    return {
      pagination: buildPaginationMeta(total, page, limit),
      data: data.map(toColaboradorResponse),
    };
  }

  @Get(':uuid')
  @Roles(Role.ADMIN, Role.GERENTE)
  @ApiOperation({ summary: 'Buscar colaborador por UUID' })
  @ApiParam({
    name: 'uuid',
    description: 'UUID do colaborador',
    example: '8d3e0b8a-4e38-4d1b-9f6a-123456789abc',
    format: 'uuid',
  })
  @ApiResponse({ status: 200, type: ColaboradorResponseDto })
  @ApiResponse({ status: 404, description: 'Colaborador não encontrado' })
  async findOne(@Param('uuid', new ParseUUIDPipe()) uuid: string) {
    const c = await this.service.findById(uuid);
    return toColaboradorResponse(c);
  }

  @Post()
  @Roles(Role.ADMIN)
  @ApiOperation({ summary: 'Criar colaborador (ADMIN)' })
  @ApiResponse({ status: 201, type: ColaboradorResponseDto })
  @ApiResponse({ status: 409, description: 'Email, CPF ou registro já cadastrado' })
  async create(@Body() dto: CreateColaboradorDto) {
    const c = await this.service.create(dto);
    return toColaboradorResponse(c);
  }

  @Patch(':uuid')
  @Roles(Role.ADMIN, Role.GERENTE)
  @ApiOperation({ summary: 'Atualizar colaborador' })
  @ApiParam({
    name: 'uuid',
    description: 'UUID do colaborador',
    example: '8d3e0b8a-4e38-4d1b-9f6a-123456789abc',
    format: 'uuid',
  })
  @ApiResponse({ status: 200, type: ColaboradorResponseDto })
  async update(
    @Param('uuid', new ParseUUIDPipe()) uuid: string,
    @Body() dto: UpdateColaboradorDto,
  ) {
    const c = await this.service.update(uuid, dto);
    return toColaboradorResponse(c);
  }

  @Delete(':uuid')
  @Roles(Role.ADMIN)
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Desativar colaborador (soft delete, ADMIN)' })
  @ApiParam({
    name: 'uuid',
    description: 'UUID do colaborador',
    example: '8d3e0b8a-4e38-4d1b-9f6a-123456789abc',
    format: 'uuid',
  })
  @ApiResponse({ status: 204 })
  async remove(@Param('uuid', new ParseUUIDPipe()) uuid: string) {
    await this.service.delete(uuid);
  }
}
