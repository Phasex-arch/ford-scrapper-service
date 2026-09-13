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
  ApiParam,
  ApiOperation,
  ApiQuery,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';
import { Role, TecnicoStatus } from '../../../generated/prisma/enums.js';
import { Roles } from '../../auth/infrastructure/decorators/roles.decorator.js';
import { RolesGuard } from '../../auth/infrastructure/guards/roles.guard.js';
import { AuditInterceptor } from '../../common/interceptors/audit.interceptor.js';
import { buildPaginationMeta } from '../../common/dto/pagination.dto.js';
import { TecnicoService } from '../application/tecnico.service.js';
import { CreateTecnicoDto } from '../application/dto/create-tecnico.dto.js';
import { UpdateTecnicoDto } from '../application/dto/update-tecnico.dto.js';
import { ListTecnicosQueryDto } from '../application/dto/list-tecnicos-query.dto.js';

@ApiTags('Técnicos')
@ApiBearerAuth()
@Controller('tecnicos')
@UseGuards(RolesGuard)
@UseInterceptors(AuditInterceptor)
export class TecnicoController {
  constructor(private readonly service: TecnicoService) {}

  @Get()
  @Roles(Role.ADMIN, Role.GERENTE, Role.FUNCIONARIO)
  @ApiOperation({ summary: 'Listar tecnicos' })
  @ApiQuery({ name: 'status', required: false, enum: TecnicoStatus })
  @ApiQuery({ name: 'especialidade', required: false })
  @ApiResponse({ status: 200, description: 'Lista paginada de técnicos' })
  async list(@Query() query: ListTecnicosQueryDto) {
    const page = query.page ?? 1;
    const limit = query.limit ?? 20;
    const { data, total } = await this.service.list({
      page,
      limit,
      status: query.status,
      especialidade: query.especialidade,
    });
    return {
      pagination: buildPaginationMeta(total, page, limit),
      data,
    };
  }

  @Get(':uuid')
  @Roles(Role.ADMIN, Role.GERENTE, Role.FUNCIONARIO)
  @ApiOperation({ summary: 'Buscar técnico por UUID' })
  @ApiParam({ name: 'uuid', description: 'UUID do técnico', format: 'uuid' })
  @ApiResponse({ status: 200, description: 'Técnico encontrado' })
  findOne(@Param('uuid', new ParseUUIDPipe()) uuid: string) {
    return this.service.findById(uuid);
  }

  @Post()
  @Roles(Role.ADMIN, Role.GERENTE)
  @ApiOperation({ summary: 'Criar tecnico (ADMIN/GERENTE)' })
  @ApiResponse({ status: 201, description: 'Técnico criado' })
  create(@Body() dto: CreateTecnicoDto) {
    return this.service.create(dto);
  }

  @Patch(':uuid')
  @Roles(Role.ADMIN, Role.GERENTE)
  @ApiOperation({ summary: 'Atualizar técnico' })
  @ApiParam({ name: 'uuid', description: 'UUID do técnico', format: 'uuid' })
  @ApiResponse({ status: 200, description: 'Técnico atualizado' })
  update(
    @Param('uuid', new ParseUUIDPipe()) uuid: string,
    @Body() dto: UpdateTecnicoDto,
  ) {
    return this.service.update(uuid, dto);
  }

  @Delete(':uuid')
  @Roles(Role.ADMIN)
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Remover técnico (ADMIN)' })
  @ApiParam({ name: 'uuid', description: 'UUID do técnico', format: 'uuid' })
  @ApiResponse({ status: 204, description: 'Técnico removido' })
  remove(@Param('uuid', new ParseUUIDPipe()) uuid: string) {
    return this.service.delete(uuid);
  }
}
