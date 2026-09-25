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
import { ClienteStatus, Role } from '../../../generated/prisma/enums.js';
import { Roles } from '../../auth/infrastructure/decorators/roles.decorator.js';
import { RolesGuard } from '../../auth/infrastructure/guards/roles.guard.js';
import { AuditInterceptor } from '../../common/interceptors/audit.interceptor.js';
import { buildPaginationMeta } from '../../common/dto/pagination.dto.js';
import { ClienteService } from '../application/cliente.service.js';
import { CreateClienteDto } from '../application/dto/create-cliente.dto.js';
import { UpdateClienteDto } from '../application/dto/update-cliente.dto.js';
import { ListClientesQueryDto } from '../application/dto/list-clientes-query.dto.js';

@ApiTags('Clientes')
@ApiStandardErrors()
@ApiBearerAuth()
@Controller('clientes')
@UseGuards(RolesGuard)
@UseInterceptors(AuditInterceptor)
export class ClienteController {
  constructor(private readonly service: ClienteService) {}

  @Get()
  @Roles(Role.ADMIN, Role.GERENTE, Role.FUNCIONARIO)
  @ApiOperation({ summary: 'Listar clientes' })
  @ApiQuery({ name: 'status', required: false, enum: ClienteStatus })
  @ApiQuery({ name: 'segmento', required: false })
  @ApiQuery({ name: 'search', required: false })
  @ApiResponse({ status: 200, description: 'Lista paginada de clientes' })
  async list(@Query() query: ListClientesQueryDto) {
    const page = query.page ?? 1;
    const limit = query.limit ?? 20;
    const { data, total } = await this.service.list({
      page,
      limit,
      status: query.status,
      segmento: query.segmento,
      search: query.search,
    });
    return {
      pagination: buildPaginationMeta(total, page, limit),
      data,
    };
  }

  @Get(':uuid')
  @Roles(Role.ADMIN, Role.GERENTE, Role.FUNCIONARIO)
  @ApiOperation({ summary: 'Buscar cliente por UUID' })
  @ApiParam({ name: 'uuid', description: 'UUID do cliente', format: 'uuid' })
  @ApiResponse({ status: 200, description: 'Cliente encontrado' })
  findOne(@Param('uuid', new ParseUUIDPipe()) uuid: string) {
    return this.service.findById(uuid);
  }

  @Post()
  @Roles(Role.ADMIN, Role.GERENTE, Role.FUNCIONARIO)
  @ApiOperation({ summary: 'Criar cliente' })
  @ApiResponse({ status: 201, description: 'Cliente criado' })
  create(@Body() dto: CreateClienteDto) {
    return this.service.create(dto);
  }

  @Patch(':uuid')
  @Roles(Role.ADMIN, Role.GERENTE, Role.FUNCIONARIO)
  @ApiOperation({ summary: 'Atualizar cliente' })
  @ApiParam({ name: 'uuid', description: 'UUID do cliente', format: 'uuid' })
  @ApiResponse({ status: 200, description: 'Cliente atualizado' })
  update(
    @Param('uuid', new ParseUUIDPipe()) uuid: string,
    @Body() dto: UpdateClienteDto,
  ) {
    return this.service.update(uuid, dto);
  }

  @Delete(':uuid')
  @Roles(Role.ADMIN, Role.GERENTE)
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Remover cliente (ADMIN/GERENTE)' })
  @ApiParam({ name: 'uuid', description: 'UUID do cliente', format: 'uuid' })
  @ApiResponse({ status: 204, description: 'Cliente removido' })
  remove(@Param('uuid', new ParseUUIDPipe()) uuid: string) {
    return this.service.delete(uuid);
  }

  @Get(':uuid/historico')
  @Roles(Role.ADMIN, Role.GERENTE, Role.FUNCIONARIO)
  @ApiOperation({ summary: 'Histórico de cadastros duplicados mesclados neste cliente' })
  @ApiParam({ name: 'uuid', description: 'UUID do cliente', format: 'uuid' })
  @ApiResponse({ status: 200, description: 'Lista de eventos de mesclagem' })
  getHistorico(@Param('uuid', new ParseUUIDPipe()) uuid: string) {
    return this.service.getHistoricoMesclagem(uuid);
  }
}
