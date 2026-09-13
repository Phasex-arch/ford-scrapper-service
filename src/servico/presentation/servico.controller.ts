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
  OrdemServicoPrioridade,
  OrdemServicoStatus,
  Role,
} from '../../../generated/prisma/enums.js';
import { Roles } from '../../auth/infrastructure/decorators/roles.decorator.js';
import { RolesGuard } from '../../auth/infrastructure/guards/roles.guard.js';
import { AuditInterceptor } from '../../common/interceptors/audit.interceptor.js';
import { buildPaginationMeta } from '../../common/dto/pagination.dto.js';
import { ServicoService } from '../application/servico.service.js';
import { CreateServicoDto } from '../application/dto/create-servico.dto.js';
import { UpdateServicoDto } from '../application/dto/update-servico.dto.js';
import { ListServicosQueryDto } from '../application/dto/list-servicos-query.dto.js';

@ApiTags('Serviços')
@ApiBearerAuth()
@Controller('servicos')
@UseGuards(RolesGuard)
@UseInterceptors(AuditInterceptor)
export class ServicoController {
  constructor(private readonly service: ServicoService) {}

  @Get()
  @Roles(Role.ADMIN, Role.GERENTE, Role.FUNCIONARIO)
  @ApiOperation({ summary: 'Listar ordens de servico' })
  @ApiQuery({ name: 'status', required: false, enum: OrdemServicoStatus })
  @ApiQuery({
    name: 'prioridade',
    required: false,
    enum: OrdemServicoPrioridade,
  })
  @ApiQuery({ name: 'tecnico', required: false })
  @ApiQuery({ name: 'search', required: false })
  @ApiResponse({ status: 200, description: 'Lista paginada de ordens de serviço' })
  async list(@Query() query: ListServicosQueryDto) {
    const page = query.page ?? 1;
    const limit = query.limit ?? 20;
    const { data, total } = await this.service.list({
      page,
      limit,
      status: query.status,
      prioridade: query.prioridade,
      tecnico: query.tecnico,
      search: query.search,
    });
    return {
      pagination: buildPaginationMeta(total, page, limit),
      data,
    };
  }

  @Get(':uuid')
  @Roles(Role.ADMIN, Role.GERENTE, Role.FUNCIONARIO)
  @ApiOperation({ summary: 'Buscar ordem de serviço por UUID' })
  @ApiParam({ name: 'uuid', description: 'UUID da ordem de serviço', format: 'uuid' })
  @ApiResponse({ status: 200, description: 'Ordem de serviço encontrada' })
  findOne(@Param('uuid', new ParseUUIDPipe()) uuid: string) {
    return this.service.findById(uuid);
  }

  @Post()
  @Roles(Role.ADMIN, Role.GERENTE, Role.FUNCIONARIO)
  @ApiOperation({ summary: 'Criar ordem de serviço' })
  @ApiResponse({ status: 201, description: 'Ordem de serviço criada' })
  create(@Body() dto: CreateServicoDto) {
    return this.service.create(dto);
  }

  @Patch(':uuid')
  @Roles(Role.ADMIN, Role.GERENTE, Role.FUNCIONARIO)
  @ApiOperation({ summary: 'Atualizar ordem de serviço' })
  @ApiParam({ name: 'uuid', description: 'UUID da ordem de serviço', format: 'uuid' })
  @ApiResponse({ status: 200, description: 'Ordem de serviço atualizada' })
  update(
    @Param('uuid', new ParseUUIDPipe()) uuid: string,
    @Body() dto: UpdateServicoDto,
  ) {
    return this.service.update(uuid, dto);
  }

  @Delete(':uuid')
  @Roles(Role.ADMIN, Role.GERENTE)
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Remover ordem de serviço (ADMIN/GERENTE)' })
  @ApiParam({ name: 'uuid', description: 'UUID da ordem de serviço', format: 'uuid' })
  @ApiResponse({ status: 204, description: 'Ordem de serviço removida' })
  remove(@Param('uuid', new ParseUUIDPipe()) uuid: string) {
    return this.service.delete(uuid);
  }
}
