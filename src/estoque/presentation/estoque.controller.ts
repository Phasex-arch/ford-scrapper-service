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
  CondicaoVeiculo,
  Role,
  SegmentoVeiculo,
} from '../../../generated/prisma/enums.js';
import { Roles } from '../../auth/infrastructure/decorators/roles.decorator.js';
import { RolesGuard } from '../../auth/infrastructure/guards/roles.guard.js';
import { AuditInterceptor } from '../../common/interceptors/audit.interceptor.js';
import { buildPaginationMeta } from '../../common/dto/pagination.dto.js';
import { EstoqueService } from '../application/estoque.service.js';
import { CreateEstoqueDto } from '../application/dto/create-estoque.dto.js';
import { UpdateEstoqueDto } from '../application/dto/update-estoque.dto.js';
import { ListEstoqueQueryDto } from '../application/dto/list-estoque-query.dto.js';

@ApiTags('Estoque')
@ApiBearerAuth()
@Controller('estoque')
@UseGuards(RolesGuard)
@UseInterceptors(AuditInterceptor)
export class EstoqueController {
  constructor(private readonly service: EstoqueService) {}

  @Get()
  @Roles(Role.ADMIN, Role.GERENTE, Role.FUNCIONARIO)
  @ApiOperation({ summary: 'Listar itens de estoque' })
  @ApiQuery({ name: 'condicao', required: false, enum: CondicaoVeiculo })
  @ApiQuery({ name: 'segmento', required: false, enum: SegmentoVeiculo })
  @ApiQuery({ name: 'modelo', required: false })
  @ApiQuery({ name: 'search', required: false, description: 'Busca livre em modelo, versão, cor e código' })
  @ApiQuery({ name: 'status', required: false })
  @ApiQuery({ name: 'precoMin', required: false, type: Number })
  @ApiQuery({ name: 'precoMax', required: false, type: Number })
  @ApiResponse({ status: 200, description: 'Lista paginada de itens de estoque' })
  async list(@Query() query: ListEstoqueQueryDto) {
    const page = query.page ?? 1;
    const limit = query.limit ?? 20;
    const { data, total } = await this.service.list({
      page,
      limit,
      condicao: query.condicao,
      segmento: query.segmento,
      modelo: query.modelo,
      search: query.search,
      status: query.status,
      precoMin: query.precoMin,
      precoMax: query.precoMax,
    });
    return {
      pagination: buildPaginationMeta(total, page, limit),
      data,
    };
  }

  @Get(':uuid')
  @Roles(Role.ADMIN, Role.GERENTE, Role.FUNCIONARIO)
  @ApiOperation({ summary: 'Buscar item por UUID' })
  @ApiParam({ name: 'uuid', description: 'UUID do item de estoque', format: 'uuid' })
  @ApiResponse({ status: 200, description: 'Item de estoque encontrado' })
  findOne(@Param('uuid', new ParseUUIDPipe()) uuid: string) {
    return this.service.findById(uuid);
  }

  @Post()
  @Roles(Role.ADMIN, Role.GERENTE)
  @ApiOperation({ summary: 'Criar item de estoque' })
  @ApiResponse({ status: 201, description: 'Item de estoque criado' })
  create(@Body() dto: CreateEstoqueDto) {
    return this.service.create(dto);
  }

  @Patch(':uuid')
  @Roles(Role.ADMIN, Role.GERENTE)
  @ApiOperation({ summary: 'Atualizar item de estoque' })
  @ApiParam({ name: 'uuid', description: 'UUID do item de estoque', format: 'uuid' })
  @ApiResponse({ status: 200, description: 'Item de estoque atualizado' })
  update(
    @Param('uuid', new ParseUUIDPipe()) uuid: string,
    @Body() dto: UpdateEstoqueDto,
  ) {
    return this.service.update(uuid, dto);
  }

  @Delete(':uuid')
  @Roles(Role.ADMIN)
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Remover item de estoque (ADMIN)' })
  @ApiParam({ name: 'uuid', description: 'UUID do item de estoque', format: 'uuid' })
  @ApiResponse({ status: 204, description: 'Item de estoque removido' })
  remove(@Param('uuid', new ParseUUIDPipe()) uuid: string) {
    return this.service.delete(uuid);
  }
}
