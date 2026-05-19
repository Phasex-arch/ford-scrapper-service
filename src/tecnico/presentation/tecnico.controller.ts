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
import { Role, TecnicoStatus } from '../../../generated/prisma/enums.js';
import { Roles } from '../../auth/infrastructure/decorators/roles.decorator.js';
import { RolesGuard } from '../../auth/infrastructure/guards/roles.guard.js';
import { AuditInterceptor } from '../../common/interceptors/audit.interceptor.js';
import {
  buildPaginationMeta,
  PaginationQueryDto,
} from '../../common/dto/pagination.dto.js';
import { TecnicoService } from '../application/tecnico.service.js';
import { CreateTecnicoDto } from '../application/dto/create-tecnico.dto.js';
import { UpdateTecnicoDto } from '../application/dto/update-tecnico.dto.js';

@ApiTags('Tecnicos')
@ApiBearerAuth()
@Controller('tecnicos')
@UseGuards(RolesGuard)
@UseInterceptors(AuditInterceptor)
export class TecnicoController {
  constructor(private readonly service: TecnicoService) {}

  @Get()
  @Roles(Role.ADMIN, Role.GERENTE, Role.FUNCIONARIO)
  @ApiOperation({ summary: 'Listar tecnicos' })
  @ApiQuery({ name: 'status', required: false, enum: TecnicoStatus })
  @ApiQuery({ name: 'especialidade', required: false })
  @ApiResponse({ status: 200 })
  async list(
    @Query() pagination: PaginationQueryDto,
    @Query('status') status?: TecnicoStatus,
    @Query('especialidade') especialidade?: string,
  ) {
    const page = pagination.page ?? 1;
    const limit = pagination.limit ?? 20;
    const { data, total } = await this.service.list({
      page,
      limit,
      status,
      especialidade,
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
  @ApiOperation({ summary: 'Criar tecnico (ADMIN/GERENTE)' })
  create(@Body() dto: CreateTecnicoDto) {
    return this.service.create(dto);
  }

  @Patch(':id')
  @Roles(Role.ADMIN, Role.GERENTE)
  update(
    @Param('id', new ParseUUIDPipe()) id: string,
    @Body() dto: UpdateTecnicoDto,
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
