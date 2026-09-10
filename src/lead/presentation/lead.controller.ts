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
import { LeadService } from '../application/lead.service.js';
import { CreateLeadDto } from '../application/dto/create-lead.dto.js';
import { ListLeadQueryDto } from '../application/dto/list-lead-query.dto.js';
import { UpdateLeadDto } from '../application/dto/update-lead.dto.js';

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
  @ApiResponse({ status: 200 })
  async list(@Query() query: ListLeadQueryDto) {
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

  @Get(':id')
  @Roles(Role.ADMIN, Role.GERENTE, Role.FUNCIONARIO)
  findOne(@Param('id', new ParseUUIDPipe()) id: string) {
    return this.service.findById(id);
  }

  @Post()
  @Roles(Role.ADMIN, Role.GERENTE, Role.FUNCIONARIO)
  create(@Body() dto: CreateLeadDto) {
    return this.service.create(dto);
  }

  @Patch(':id')
  @Roles(Role.ADMIN, Role.GERENTE, Role.FUNCIONARIO)
  update(
    @Param('id', new ParseUUIDPipe()) id: string,
    @Body() dto: UpdateLeadDto,
  ) {
    return this.service.update(id, dto);
  }

  @Delete(':id')
  @Roles(Role.ADMIN, Role.GERENTE)
  @HttpCode(HttpStatus.NO_CONTENT)
  remove(@Param('id', new ParseUUIDPipe()) id: string) {
    return this.service.delete(id);
  }
}
