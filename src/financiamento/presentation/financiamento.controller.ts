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
import {
  FinanciamentoStatus,
  Role,
} from '../../../generated/prisma/enums.js';
import { Roles } from '../../auth/infrastructure/decorators/roles.decorator.js';
import { RolesGuard } from '../../auth/infrastructure/guards/roles.guard.js';
import { AuditInterceptor } from '../../common/interceptors/audit.interceptor.js';
import { buildPaginationMeta } from '../../common/dto/pagination.dto.js';
import { FinanciamentoService } from '../application/financiamento.service.js';
import { CreateFinanciamentoDto } from '../application/dto/create-financiamento.dto.js';
import { UpdateFinanciamentoDto } from '../application/dto/update-financiamento.dto.js';
import { ListFinanciamentosQueryDto } from '../application/dto/list-financiamentos-query.dto.js';

@ApiTags('Financiamentos')
@ApiBearerAuth()
@Controller('financiamentos')
@UseGuards(RolesGuard)
@UseInterceptors(AuditInterceptor)
export class FinanciamentoController {
  constructor(private readonly service: FinanciamentoService) {}

  @Get()
  @Roles(Role.ADMIN, Role.GERENTE, Role.FUNCIONARIO)
  @ApiOperation({ summary: 'Listar financiamentos' })
  @ApiQuery({ name: 'status', required: false, enum: FinanciamentoStatus })
  @ApiQuery({ name: 'search', required: false })
  @ApiResponse({ status: 200, description: 'Lista paginada de financiamentos' })
  async list(@Query() query: ListFinanciamentosQueryDto) {
    const page = query.page ?? 1;
    const limit = query.limit ?? 20;
    const { data, total } = await this.service.list({
      page,
      limit,
      status: query.status,
      search: query.search,
    });
    return {
      pagination: buildPaginationMeta(total, page, limit),
      data,
    };
  }

  @Get(':uuid')
  @Roles(Role.ADMIN, Role.GERENTE, Role.FUNCIONARIO)
  @ApiOperation({ summary: 'Buscar financiamento por UUID' })
  @ApiParam({ name: 'uuid', description: 'UUID do financiamento', format: 'uuid' })
  @ApiResponse({ status: 200, description: 'Financiamento encontrado' })
  findOne(@Param('uuid', new ParseUUIDPipe()) uuid: string) {
    return this.service.findById(uuid);
  }

  @Post()
  @Roles(Role.ADMIN, Role.GERENTE)
  @ApiOperation({ summary: 'Criar financiamento (ADMIN/GERENTE)' })
  @ApiResponse({ status: 201, description: 'Financiamento criado' })
  create(@Body() dto: CreateFinanciamentoDto) {
    return this.service.create(dto);
  }

  @Patch(':uuid')
  @Roles(Role.ADMIN, Role.GERENTE)
  @ApiOperation({ summary: 'Atualizar financiamento' })
  @ApiParam({ name: 'uuid', description: 'UUID do financiamento', format: 'uuid' })
  @ApiResponse({ status: 200, description: 'Financiamento atualizado' })
  update(
    @Param('uuid', new ParseUUIDPipe()) uuid: string,
    @Body() dto: UpdateFinanciamentoDto,
  ) {
    return this.service.update(uuid, dto);
  }

  @Delete(':uuid')
  @Roles(Role.ADMIN)
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Remover financiamento (ADMIN)' })
  @ApiParam({ name: 'uuid', description: 'UUID do financiamento', format: 'uuid' })
  @ApiResponse({ status: 204, description: 'Financiamento removido' })
  remove(@Param('uuid', new ParseUUIDPipe()) uuid: string) {
    return this.service.delete(uuid);
  }
}
