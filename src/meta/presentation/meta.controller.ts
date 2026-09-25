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
import { ApiStandardErrors } from '../../common/swagger/api-standard-errors.decorator.js';
import { Role } from '../../../generated/prisma/enums.js';
import { Roles } from '../../auth/infrastructure/decorators/roles.decorator.js';
import { RolesGuard } from '../../auth/infrastructure/guards/roles.guard.js';
import { AuditInterceptor } from '../../common/interceptors/audit.interceptor.js';
import { buildPaginationMeta } from '../../common/dto/pagination.dto.js';
import { MetaService } from '../application/meta.service.js';
import { CreateMetaDto } from '../application/dto/create-meta.dto.js';
import { UpdateMetaDto } from '../application/dto/update-meta.dto.js';
import { ListMetasQueryDto } from '../application/dto/list-metas-query.dto.js';

@ApiTags('Metas')
@ApiStandardErrors()
@ApiBearerAuth()
@Controller('metas')
@UseGuards(RolesGuard)
@UseInterceptors(AuditInterceptor)
export class MetaController {
  constructor(private readonly service: MetaService) {}

  @Get()
  @Roles(Role.ADMIN, Role.GERENTE, Role.FUNCIONARIO)
  @ApiOperation({ summary: 'Listar metas' })
  @ApiQuery({ name: 'periodo', required: false })
  @ApiQuery({ name: 'indicador', required: false })
  @ApiResponse({ status: 200, description: 'Lista paginada de metas' })
  async list(@Query() query: ListMetasQueryDto) {
    const page = query.page ?? 1;
    const limit = query.limit ?? 20;
    const { data, total } = await this.service.list({
      page,
      limit,
      periodo: query.periodo,
      indicador: query.indicador,
    });
    return {
      pagination: buildPaginationMeta(total, page, limit),
      data,
    };
  }

  @Get(':uuid')
  @Roles(Role.ADMIN, Role.GERENTE, Role.FUNCIONARIO)
  @ApiOperation({ summary: 'Buscar meta por UUID' })
  @ApiParam({ name: 'uuid', description: 'UUID da meta', format: 'uuid' })
  @ApiResponse({ status: 200, description: 'Meta encontrada' })
  findOne(@Param('uuid', new ParseUUIDPipe()) uuid: string) {
    return this.service.findById(uuid);
  }

  @Post()
  @Roles(Role.ADMIN, Role.GERENTE)
  @ApiOperation({ summary: 'Criar meta (ADMIN/GERENTE)' })
  @ApiResponse({ status: 201, description: 'Meta criada' })
  create(@Body() dto: CreateMetaDto) {
    return this.service.create(dto);
  }

  @Patch(':uuid')
  @Roles(Role.ADMIN, Role.GERENTE)
  @ApiOperation({ summary: 'Atualizar meta' })
  @ApiParam({ name: 'uuid', description: 'UUID da meta', format: 'uuid' })
  @ApiResponse({ status: 200, description: 'Meta atualizada' })
  update(
    @Param('uuid', new ParseUUIDPipe()) uuid: string,
    @Body() dto: UpdateMetaDto,
  ) {
    return this.service.update(uuid, dto);
  }

  @Delete(':uuid')
  @Roles(Role.ADMIN)
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Remover meta (ADMIN)' })
  @ApiParam({ name: 'uuid', description: 'UUID da meta', format: 'uuid' })
  @ApiResponse({ status: 204, description: 'Meta removida' })
  remove(@Param('uuid', new ParseUUIDPipe()) uuid: string) {
    return this.service.delete(uuid);
  }
}
