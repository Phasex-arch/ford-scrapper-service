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
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';
import { Role } from '../../../generated/prisma/enums.js';
import { Roles } from '../../auth/infrastructure/decorators/roles.decorator.js';
import { RolesGuard } from '../../auth/infrastructure/guards/roles.guard.js';
import { AuditInterceptor } from '../../common/interceptors/audit.interceptor.js';
import { buildPaginationMeta } from '../../common/dto/pagination.dto.js';
import { ClienteService } from '../application/cliente.service.js';
import { CreateClienteDto } from '../application/dto/create-cliente.dto.js';
import { ListClienteQueryDto } from '../application/dto/list-cliente-query.dto.js';
import { UpdateClienteDto } from '../application/dto/update-cliente.dto.js';

@ApiTags('Clientes')
@ApiBearerAuth()
@Controller('clientes')
@UseGuards(RolesGuard)
@UseInterceptors(AuditInterceptor)
export class ClienteController {
  constructor(private readonly service: ClienteService) {}

  @Get()
  @Roles(Role.ADMIN, Role.GERENTE, Role.FUNCIONARIO)
  @ApiOperation({ summary: 'Listar clientes' })
  @ApiResponse({ status: 200 })
  async list(@Query() query: ListClienteQueryDto) {
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

  @Get(':id')
  @Roles(Role.ADMIN, Role.GERENTE, Role.FUNCIONARIO)
  @ApiOperation({ summary: 'Buscar cliente por ID' })
  findOne(@Param('id', new ParseUUIDPipe()) id: string) {
    return this.service.findById(id);
  }

  @Post()
  @Roles(Role.ADMIN, Role.GERENTE, Role.FUNCIONARIO)
  @ApiOperation({ summary: 'Criar cliente' })
  create(@Body() dto: CreateClienteDto) {
    return this.service.create(dto);
  }

  @Patch(':id')
  @Roles(Role.ADMIN, Role.GERENTE, Role.FUNCIONARIO)
  @ApiOperation({ summary: 'Atualizar cliente' })
  update(
    @Param('id', new ParseUUIDPipe()) id: string,
    @Body() dto: UpdateClienteDto,
  ) {
    return this.service.update(id, dto);
  }

  @Delete(':id')
  @Roles(Role.ADMIN, Role.GERENTE)
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Remover cliente (ADMIN/GERENTE)' })
  remove(@Param('id', new ParseUUIDPipe()) id: string) {
    return this.service.delete(id);
  }
}
