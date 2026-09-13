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
import { AgendamentoStatus, Role } from '../../../generated/prisma/enums.js';
import { Roles } from '../../auth/infrastructure/decorators/roles.decorator.js';
import { RolesGuard } from '../../auth/infrastructure/guards/roles.guard.js';
import { AuditInterceptor } from '../../common/interceptors/audit.interceptor.js';
import { buildPaginationMeta } from '../../common/dto/pagination.dto.js';
import { AgendamentoService } from '../application/agendamento.service.js';
import { CreateAgendamentoDto } from '../application/dto/create-agendamento.dto.js';
import { UpdateAgendamentoDto } from '../application/dto/update-agendamento.dto.js';
import { ListAgendamentosQueryDto } from '../application/dto/list-agendamentos-query.dto.js';

@ApiTags('Agendamentos')
@ApiBearerAuth()
@Controller('agendamentos')
@UseGuards(RolesGuard)
@UseInterceptors(AuditInterceptor)
export class AgendamentoController {
  constructor(private readonly service: AgendamentoService) {}

  @Get()
  @Roles(Role.ADMIN, Role.GERENTE, Role.FUNCIONARIO)
  @ApiOperation({ summary: 'Listar agendamentos' })
  @ApiQuery({ name: 'data', required: false, description: 'Filtra por dia (YYYY-MM-DD)' })
  @ApiQuery({ name: 'status', required: false, enum: AgendamentoStatus })
  @ApiQuery({ name: 'leadId', required: false, description: 'Filtra por UUID do lead' })
  @ApiResponse({ status: 200, description: 'Lista paginada de agendamentos' })
  async list(@Query() query: ListAgendamentosQueryDto) {
    const page = query.page ?? 1;
    const limit = query.limit ?? 50;
    const { data: items, total } = await this.service.list({
      page, limit, data: query.data, status: query.status, leadId: query.leadId,
    });
    return {
      pagination: buildPaginationMeta(total, page, limit),
      data: items,
    };
  }

  @Get(':uuid')
  @Roles(Role.ADMIN, Role.GERENTE, Role.FUNCIONARIO)
  @ApiOperation({ summary: 'Buscar agendamento por UUID' })
  @ApiParam({ name: 'uuid', description: 'UUID do agendamento', format: 'uuid' })
  @ApiResponse({ status: 200, description: 'Agendamento encontrado' })
  findOne(@Param('uuid', new ParseUUIDPipe()) uuid: string) {
    return this.service.findById(uuid);
  }

  @Post()
  @Roles(Role.ADMIN, Role.GERENTE, Role.FUNCIONARIO)
  @ApiOperation({ summary: 'Criar agendamento' })
  @ApiResponse({ status: 201, description: 'Agendamento criado' })
  create(@Body() dto: CreateAgendamentoDto) {
    return this.service.create(dto);
  }

  @Patch(':uuid')
  @Roles(Role.ADMIN, Role.GERENTE, Role.FUNCIONARIO)
  @ApiOperation({ summary: 'Atualizar agendamento (inclui cancelar via status)' })
  @ApiParam({ name: 'uuid', description: 'UUID do agendamento', format: 'uuid' })
  @ApiResponse({ status: 200, description: 'Agendamento atualizado' })
  update(
    @Param('uuid', new ParseUUIDPipe()) uuid: string,
    @Body() dto: UpdateAgendamentoDto,
  ) {
    return this.service.update(uuid, dto);
  }

  @Delete(':uuid')
  @Roles(Role.ADMIN, Role.GERENTE)
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Remover agendamento (ADMIN/GERENTE)' })
  @ApiParam({ name: 'uuid', description: 'UUID do agendamento', format: 'uuid' })
  @ApiResponse({ status: 204, description: 'Agendamento removido' })
  remove(@Param('uuid', new ParseUUIDPipe()) uuid: string) {
    return this.service.delete(uuid);
  }
}
