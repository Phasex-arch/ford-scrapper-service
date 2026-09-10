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
import { ServicoService } from '../application/servico.service.js';
import { CreateServicoDto } from '../application/dto/create-servico.dto.js';
import { ListServicoQueryDto } from '../application/dto/list-servico-query.dto.js';
import { UpdateServicoDto } from '../application/dto/update-servico.dto.js';

@ApiTags('Servicos')
@ApiBearerAuth()
@Controller('servicos')
@UseGuards(RolesGuard)
@UseInterceptors(AuditInterceptor)
export class ServicoController {
  constructor(private readonly service: ServicoService) {}

  @Get()
  @Roles(Role.ADMIN, Role.GERENTE, Role.FUNCIONARIO)
  @ApiOperation({ summary: 'Listar ordens de servico' })
  @ApiResponse({ status: 200 })
  async list(@Query() query: ListServicoQueryDto) {
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

  @Get(':id')
  @Roles(Role.ADMIN, Role.GERENTE, Role.FUNCIONARIO)
  findOne(@Param('id', new ParseUUIDPipe()) id: string) {
    return this.service.findById(id);
  }

  @Post()
  @Roles(Role.ADMIN, Role.GERENTE, Role.FUNCIONARIO)
  create(@Body() dto: CreateServicoDto) {
    return this.service.create(dto);
  }

  @Patch(':id')
  @Roles(Role.ADMIN, Role.GERENTE, Role.FUNCIONARIO)
  update(
    @Param('id', new ParseUUIDPipe()) id: string,
    @Body() dto: UpdateServicoDto,
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
