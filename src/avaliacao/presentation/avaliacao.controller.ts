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
import { Throttle } from '@nestjs/throttler';
import {
  ApiBearerAuth,
  ApiOperation,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';
import { Role } from '../../../generated/prisma/enums.js';
import { Public } from '../../auth/infrastructure/decorators/public.decorator.js';
import { Roles } from '../../auth/infrastructure/decorators/roles.decorator.js';
import { RolesGuard } from '../../auth/infrastructure/guards/roles.guard.js';
import { AuditInterceptor } from '../../common/interceptors/audit.interceptor.js';
import { buildPaginationMeta } from '../../common/dto/pagination.dto.js';
import { AvaliacaoService } from '../application/avaliacao.service.js';
import { CreateAvaliacaoDto } from '../application/dto/create-avaliacao.dto.js';
import { ListAvaliacaoQueryDto } from '../application/dto/list-avaliacao-query.dto.js';
import { UpdateAvaliacaoDto } from '../application/dto/update-avaliacao.dto.js';

@ApiTags('Avaliacoes')
@Controller('avaliacoes')
export class AvaliacaoController {
  constructor(private readonly service: AvaliacaoService) {}

  @Public()
  @Get()
  @ApiOperation({ summary: 'Listar avaliacoes (publico)' })
  @ApiResponse({ status: 200 })
  async list(@Query() query: ListAvaliacaoQueryDto) {
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
  @ApiOperation({ summary: 'Estatisticas publicas das avaliacoes' })
  stats() {
    return this.service.stats();
  }

  @Public()
  @Get(':id')
  @ApiOperation({ summary: 'Buscar avaliacao por ID (publico)' })
  findOne(@Param('id', new ParseUUIDPipe()) id: string) {
    return this.service.findById(id);
  }

  /**
   * P1-3: escrita anonima precisa de teto proprio — herdar os 60/min globais
   * permitia 60 insercoes por minuto por IP. Nao passa pelo AuditInterceptor:
   * requisicao sem autenticacao geraria AuditLog sem autor, dobrando o custo
   * de cada abuso e poluindo a trilha de auditoria.
   */
  @Public()
  @Post()
  @Throttle({ default: { limit: 5, ttl: 60_000 } })
  @ApiOperation({ summary: 'Criar avaliacao (publico)' })
  @ApiResponse({ status: 429, description: 'Limite de requisicoes excedido' })
  create(@Body() dto: CreateAvaliacaoDto) {
    return this.service.create(dto);
  }

  @UseGuards(RolesGuard)
  @UseInterceptors(AuditInterceptor)
  @Roles(Role.ADMIN, Role.GERENTE, Role.FUNCIONARIO)
  @ApiBearerAuth()
  @Patch(':id')
  @ApiOperation({ summary: 'Atualizar avaliacao (autenticado)' })
  update(
    @Param('id', new ParseUUIDPipe()) id: string,
    @Body() dto: UpdateAvaliacaoDto,
  ) {
    return this.service.update(id, dto);
  }

  @UseGuards(RolesGuard)
  @UseInterceptors(AuditInterceptor)
  @Roles(Role.ADMIN, Role.GERENTE)
  @ApiBearerAuth()
  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Remover avaliacao (ADMIN/GERENTE)' })
  remove(@Param('id', new ParseUUIDPipe()) id: string) {
    return this.service.delete(id);
  }
}
