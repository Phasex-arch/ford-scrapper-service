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
import { Throttle } from '@nestjs/throttler';
import { Role } from '../../../generated/prisma/enums.js';
import { Public } from '../../auth/infrastructure/decorators/public.decorator.js';
import { Roles } from '../../auth/infrastructure/decorators/roles.decorator.js';
import { RolesGuard } from '../../auth/infrastructure/guards/roles.guard.js';
import { AuditInterceptor } from '../../common/interceptors/audit.interceptor.js';
import { buildPaginationMeta } from '../../common/dto/pagination.dto.js';
import { AvaliacaoService } from '../application/avaliacao.service.js';
import { CreateAvaliacaoDto } from '../application/dto/create-avaliacao.dto.js';
import { UpdateAvaliacaoDto } from '../application/dto/update-avaliacao.dto.js';
import { ListAvaliacoesQueryDto } from '../application/dto/list-avaliacoes-query.dto.js';

@ApiTags('Avaliações')
@ApiStandardErrors()
@Controller('avaliacoes')
@UseInterceptors(AuditInterceptor)
export class AvaliacaoController {
  constructor(private readonly service: AvaliacaoService) {}

  @Public()
  @Get()
  @ApiOperation({ summary: 'Listar avaliações (público)' })
  @ApiQuery({ name: 'notaMin', required: false, type: Number })
  @ApiQuery({ name: 'notaMax', required: false, type: Number })
  @ApiResponse({ status: 200, description: 'Lista paginada de avaliações' })
  async list(@Query() query: ListAvaliacoesQueryDto) {
    const page = query.page ?? 1;
    const limit = query.limit ?? 20;
    const { data, total } = await this.service.list({
      page,
      limit,
      notaMin: query.notaMin,
      notaMax: query.notaMax,
    });
    return {
      pagination: buildPaginationMeta(total, page, limit),
      data,
    };
  }

  @Public()
  @Get('stats')
  @ApiOperation({ summary: 'Estatísticas públicas das avaliações (só aprovadas)' })
  stats() {
    return this.service.stats();
  }

  @UseGuards(RolesGuard)
  @Roles(Role.ADMIN, Role.GERENTE, Role.FUNCIONARIO)
  @ApiBearerAuth()
  @Get('todas')
  @ApiOperation({ summary: 'Listar todas as avaliações pra moderação, qualquer status (staff)' })
  @ApiQuery({ name: 'status', required: false })
  @ApiResponse({ status: 200, description: 'Lista paginada de avaliações (todos os status)' })
  async listTodas(@Query() query: ListAvaliacoesQueryDto) {
    const page = query.page ?? 1;
    const limit = query.limit ?? 20;
    const { data, total } = await this.service.listTodas({
      page,
      limit,
      notaMin: query.notaMin,
      notaMax: query.notaMax,
      status: query.status,
    });
    return {
      pagination: buildPaginationMeta(total, page, limit),
      data,
    };
  }

  @Public()
  @Get(':uuid')
  @ApiOperation({ summary: 'Buscar avaliação por UUID (público, só aprovadas)' })
  @ApiParam({ name: 'uuid', description: 'UUID da avaliação', format: 'uuid' })
  @ApiResponse({ status: 200, description: 'Avaliação encontrada' })
  findOne(@Param('uuid', new ParseUUIDPipe()) uuid: string) {
    return this.service.findByIdPublic(uuid);
  }

  @Public()
  @Post()
  @Throttle({ default: { limit: 3, ttl: 60_000 } })
  @ApiOperation({
    summary: 'Criar avaliação (público)',
    description: 'Limitado a 3 requisições por minuto por origem.',
  })
  @ApiResponse({ status: 201, description: 'Avaliação criada' })
  @ApiResponse({ status: 429, description: 'Limite de requisições excedido' })
  create(@Body() dto: CreateAvaliacaoDto) {
    return this.service.create(dto);
  }

  @UseGuards(RolesGuard)
  @Roles(Role.ADMIN, Role.GERENTE, Role.FUNCIONARIO)
  @ApiBearerAuth()
  @Patch(':uuid')
  @ApiOperation({ summary: 'Atualizar avaliação (autenticado)' })
  @ApiParam({ name: 'uuid', description: 'UUID da avaliação', format: 'uuid' })
  @ApiResponse({ status: 200, description: 'Avaliação atualizada' })
  update(
    @Param('uuid', new ParseUUIDPipe()) uuid: string,
    @Body() dto: UpdateAvaliacaoDto,
  ) {
    return this.service.update(uuid, dto);
  }

  @UseGuards(RolesGuard)
  @Roles(Role.ADMIN, Role.GERENTE)
  @ApiBearerAuth()
  @Delete(':uuid')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Remover avaliação (ADMIN/GERENTE)' })
  @ApiParam({ name: 'uuid', description: 'UUID da avaliação', format: 'uuid' })
  @ApiResponse({ status: 204, description: 'Avaliação removida' })
  remove(@Param('uuid', new ParseUUIDPipe()) uuid: string) {
    return this.service.delete(uuid);
  }
}
