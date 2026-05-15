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
import {
  buildPaginationMeta,
  PaginationQueryDto,
} from '../../common/dto/pagination.dto.js';
import { EstoqueService } from '../application/estoque.service.js';
import { CreateEstoqueDto } from '../application/dto/create-estoque.dto.js';
import { UpdateEstoqueDto } from '../application/dto/update-estoque.dto.js';

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
  @ApiQuery({ name: 'status', required: false })
  @ApiQuery({ name: 'precoMin', required: false, type: Number })
  @ApiQuery({ name: 'precoMax', required: false, type: Number })
  @ApiResponse({ status: 200 })
  async list(
    @Query() pagination: PaginationQueryDto,
    @Query('condicao') condicao?: CondicaoVeiculo,
    @Query('segmento') segmento?: SegmentoVeiculo,
    @Query('modelo') modelo?: string,
    @Query('status') status?: string,
    @Query('precoMin') precoMin?: string,
    @Query('precoMax') precoMax?: string,
  ) {
    const page = pagination.page ?? 1;
    const limit = pagination.limit ?? 20;
    const { data, total } = await this.service.list({
      page,
      limit,
      condicao,
      segmento,
      modelo,
      status,
      precoMin: precoMin ? Number(precoMin) : undefined,
      precoMax: precoMax ? Number(precoMax) : undefined,
    });
    return {
      pagination: buildPaginationMeta(total, page, limit),
      data,
    };
  }

  @Get(':id')
  @Roles(Role.ADMIN, Role.GERENTE, Role.FUNCIONARIO)
  @ApiOperation({ summary: 'Buscar item por ID' })
  findOne(@Param('id', new ParseUUIDPipe()) id: string) {
    return this.service.findById(id);
  }

  @Post()
  @Roles(Role.ADMIN, Role.GERENTE)
  @ApiOperation({ summary: 'Criar item de estoque' })
  create(@Body() dto: CreateEstoqueDto) {
    return this.service.create(dto);
  }

  @Patch(':id')
  @Roles(Role.ADMIN, Role.GERENTE)
  @ApiOperation({ summary: 'Atualizar item de estoque' })
  update(
    @Param('id', new ParseUUIDPipe()) id: string,
    @Body() dto: UpdateEstoqueDto,
  ) {
    return this.service.update(id, dto);
  }

  @Delete(':id')
  @Roles(Role.ADMIN)
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Remover item de estoque (ADMIN)' })
  remove(@Param('id', new ParseUUIDPipe()) id: string) {
    return this.service.delete(id);
  }
}
