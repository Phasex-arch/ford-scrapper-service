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
import { FinanciamentoService } from '../application/financiamento.service.js';
import { CreateFinanciamentoDto } from '../application/dto/create-financiamento.dto.js';
import { ListFinanciamentoQueryDto } from '../application/dto/list-financiamento-query.dto.js';
import { UpdateFinanciamentoDto } from '../application/dto/update-financiamento.dto.js';

@ApiTags('Financiamentos')
@ApiBearerAuth()
@Controller('financiamentos')
@UseGuards(RolesGuard)
@UseInterceptors(AuditInterceptor)
export class FinanciamentoController {
  constructor(private readonly service: FinanciamentoService) {}

  @Get()
  @Roles(Role.ADMIN, Role.GERENTE, Role.FUNCIONARIO)
  @ApiOperation({ summary: 'Listar financiamentos' })
  @ApiResponse({ status: 200 })
  async list(@Query() query: ListFinanciamentoQueryDto) {
    const page = query.page ?? 1;
    const limit = query.limit ?? 20;
    const { data, total } = await this.service.list({
      page,
      limit,
      status: query.status,
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
  @Roles(Role.ADMIN, Role.GERENTE)
  @ApiOperation({ summary: 'Criar financiamento (ADMIN/GERENTE)' })
  create(@Body() dto: CreateFinanciamentoDto) {
    return this.service.create(dto);
  }

  @Patch(':id')
  @Roles(Role.ADMIN, Role.GERENTE)
  update(
    @Param('id', new ParseUUIDPipe()) id: string,
    @Body() dto: UpdateFinanciamentoDto,
  ) {
    return this.service.update(id, dto);
  }

  @Delete(':id')
  @Roles(Role.ADMIN)
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Remover financiamento (ADMIN)' })
  remove(@Param('id', new ParseUUIDPipe()) id: string) {
    return this.service.delete(id);
  }
}
