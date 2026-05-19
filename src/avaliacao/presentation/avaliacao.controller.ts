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
import { Role } from '../../../generated/prisma/enums.js';
import { Public } from '../../auth/infrastructure/decorators/public.decorator.js';
import { Roles } from '../../auth/infrastructure/decorators/roles.decorator.js';
import { RolesGuard } from '../../auth/infrastructure/guards/roles.guard.js';
import { AuditInterceptor } from '../../common/interceptors/audit.interceptor.js';
import {
  buildPaginationMeta,
  PaginationQueryDto,
} from '../../common/dto/pagination.dto.js';
import { AvaliacaoService } from '../application/avaliacao.service.js';
import { CreateAvaliacaoDto } from '../application/dto/create-avaliacao.dto.js';
import { UpdateAvaliacaoDto } from '../application/dto/update-avaliacao.dto.js';

@ApiTags('Avaliacoes')
@Controller('avaliacoes')
@UseInterceptors(AuditInterceptor)
export class AvaliacaoController {
  constructor(private readonly service: AvaliacaoService) {}

  @Public()
  @Get()
  @ApiOperation({ summary: 'Listar avaliacoes (publico)' })
  @ApiQuery({ name: 'notaMin', required: false, type: Number })
  @ApiQuery({ name: 'notaMax', required: false, type: Number })
  @ApiResponse({ status: 200 })
  async list(
    @Query() pagination: PaginationQueryDto,
    @Query('notaMin') notaMin?: string,
    @Query('notaMax') notaMax?: string,
  ) {
    const page = pagination.page ?? 1;
    const limit = pagination.limit ?? 20;
    const { data, total } = await this.service.list({
      page,
      limit,
      notaMin: notaMin ? Number(notaMin) : undefined,
      notaMax: notaMax ? Number(notaMax) : undefined,
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

  @Public()
  @Post()
  @ApiOperation({ summary: 'Criar avaliacao (publico)' })
  create(@Body() dto: CreateAvaliacaoDto) {
    return this.service.create(dto);
  }

  @UseGuards(RolesGuard)
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
  @Roles(Role.ADMIN, Role.GERENTE)
  @ApiBearerAuth()
  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Remover avaliacao (ADMIN/GERENTE)' })
  remove(@Param('id', new ParseUUIDPipe()) id: string) {
    return this.service.delete(id);
  }
}
