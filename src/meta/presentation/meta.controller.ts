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
import { Roles } from '../../auth/infrastructure/decorators/roles.decorator.js';
import { RolesGuard } from '../../auth/infrastructure/guards/roles.guard.js';
import { AuditInterceptor } from '../../common/interceptors/audit.interceptor.js';
import {
  buildPaginationMeta,
  PaginationQueryDto,
} from '../../common/dto/pagination.dto.js';
import { MetaService } from '../application/meta.service.js';
import { CreateMetaDto } from '../application/dto/create-meta.dto.js';
import { UpdateMetaDto } from '../application/dto/update-meta.dto.js';

@ApiTags('Metas')
@ApiBearerAuth()
@Controller('metas')
@UseGuards(RolesGuard)
@UseInterceptors(AuditInterceptor)
export class MetaController {
  constructor(private readonly service: MetaService) {}

  @Get()
  @Roles(Role.ADMIN, Role.GERENTE, Role.FUNCIONARIO)
  @ApiOperation({ summary: 'Listar metas' })
  @ApiQuery({ name: 'periodo', required: false })
  @ApiQuery({ name: 'indicador', required: false })
  @ApiResponse({ status: 200 })
  async list(
    @Query() pagination: PaginationQueryDto,
    @Query('periodo') periodo?: string,
    @Query('indicador') indicador?: string,
  ) {
    const page = pagination.page ?? 1;
    const limit = pagination.limit ?? 20;
    const { data, total } = await this.service.list({
      page,
      limit,
      periodo,
      indicador,
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
  @ApiOperation({ summary: 'Criar meta (ADMIN/GERENTE)' })
  create(@Body() dto: CreateMetaDto) {
    return this.service.create(dto);
  }

  @Patch(':id')
  @Roles(Role.ADMIN, Role.GERENTE)
  update(
    @Param('id', new ParseUUIDPipe()) id: string,
    @Body() dto: UpdateMetaDto,
  ) {
    return this.service.update(id, dto);
  }

  @Delete(':id')
  @Roles(Role.ADMIN)
  @HttpCode(HttpStatus.NO_CONTENT)
  remove(@Param('id', new ParseUUIDPipe()) id: string) {
    return this.service.delete(id);
  }
}
