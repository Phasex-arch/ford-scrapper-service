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
import { LeadUrgencia, Role } from '../../../generated/prisma/enums.js';
import { Roles } from '../../auth/infrastructure/decorators/roles.decorator.js';
import { RolesGuard } from '../../auth/infrastructure/guards/roles.guard.js';
import { AuditInterceptor } from '../../common/interceptors/audit.interceptor.js';
import { buildPaginationMeta } from '../../common/dto/pagination.dto.js';
import { LeadService } from '../application/lead.service.js';
import { CreateLeadDto } from '../application/dto/create-lead.dto.js';
import { UpdateLeadDto } from '../application/dto/update-lead.dto.js';
import { ListLeadsQueryDto } from '../application/dto/list-leads-query.dto.js';

@ApiTags('Leads')
@ApiBearerAuth()
@Controller('leads')
@UseGuards(RolesGuard)
@UseInterceptors(AuditInterceptor)
export class LeadController {
  constructor(private readonly service: LeadService) {}

  @Get()
  @Roles(Role.ADMIN, Role.GERENTE, Role.FUNCIONARIO)
  @ApiOperation({ summary: 'Listar leads' })
  @ApiQuery({ name: 'urgencia', required: false, enum: LeadUrgencia })
  @ApiQuery({ name: 'search', required: false })
  @ApiResponse({ status: 200, description: 'Lista paginada de leads' })
  async list(@Query() query: ListLeadsQueryDto) {
    const page = query.page ?? 1;
    const limit = query.limit ?? 20;
    const { data, total } = await this.service.list({
      page,
      limit,
      urgencia: query.urgencia,
      search: query.search,
    });
    return {
      pagination: buildPaginationMeta(total, page, limit),
      data,
    };
  }

  @Get(':uuid')
  @Roles(Role.ADMIN, Role.GERENTE, Role.FUNCIONARIO)
  @ApiOperation({ summary: 'Buscar lead por UUID' })
  @ApiParam({ name: 'uuid', description: 'UUID do lead', format: 'uuid' })
  @ApiResponse({ status: 200, description: 'Lead encontrado' })
  findOne(@Param('uuid', new ParseUUIDPipe()) uuid: string) {
    return this.service.findById(uuid);
  }

  @Post()
  @Roles(Role.ADMIN, Role.GERENTE, Role.FUNCIONARIO)
  @ApiOperation({ summary: 'Criar lead' })
  @ApiResponse({ status: 201, description: 'Lead criado' })
  create(@Body() dto: CreateLeadDto) {
    return this.service.create(dto);
  }

  @Patch(':uuid')
  @Roles(Role.ADMIN, Role.GERENTE, Role.FUNCIONARIO)
  @ApiOperation({ summary: 'Atualizar lead' })
  @ApiParam({ name: 'uuid', description: 'UUID do lead', format: 'uuid' })
  @ApiResponse({ status: 200, description: 'Lead atualizado' })
  update(
    @Param('uuid', new ParseUUIDPipe()) uuid: string,
    @Body() dto: UpdateLeadDto,
  ) {
    return this.service.update(uuid, dto);
  }

  @Delete(':uuid')
  @Roles(Role.ADMIN, Role.GERENTE)
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Remover lead (ADMIN/GERENTE)' })
  @ApiParam({ name: 'uuid', description: 'UUID do lead', format: 'uuid' })
  @ApiResponse({ status: 204, description: 'Lead removido' })
  remove(@Param('uuid', new ParseUUIDPipe()) uuid: string) {
    return this.service.delete(uuid);
  }
}
