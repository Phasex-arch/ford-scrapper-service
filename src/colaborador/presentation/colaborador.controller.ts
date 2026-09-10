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
import { CurrentUser } from '../../auth/infrastructure/decorators/current-user.decorator.js';
import { Roles } from '../../auth/infrastructure/decorators/roles.decorator.js';
import { RolesGuard } from '../../auth/infrastructure/guards/roles.guard.js';
import { AuditInterceptor } from '../../common/interceptors/audit.interceptor.js';
import { buildPaginationMeta } from '../../common/dto/pagination.dto.js';
import type { AuthenticatedUser } from '../../auth/domain/authenticated-user.js';
import { ColaboradorService } from '../application/colaborador.service.js';
import { CreateColaboradorDto } from '../application/dto/create-colaborador.dto.js';
import { ListColaboradorQueryDto } from '../application/dto/list-colaborador-query.dto.js';
import { UpdateColaboradorDto } from '../application/dto/update-colaborador.dto.js';
import {
  ColaboradorResponseDto,
  toColaboradorResponse,
} from '../application/dto/colaborador-response.dto.js';

@ApiTags('Colaboradores')
@ApiBearerAuth()
@Controller('colaboradores')
@UseGuards(RolesGuard)
@UseInterceptors(AuditInterceptor)
export class ColaboradorController {
  constructor(private readonly service: ColaboradorService) {}

  @Get()
  @Roles(Role.ADMIN, Role.GERENTE)
  @ApiOperation({
    summary: 'Listar colaboradores (paginado)',
    description:
      'A7: por padrao lista apenas colaboradores ativos; use ?ativo=false para os desativados.',
  })
  @ApiResponse({ status: 200 })
  async list(@Query() query: ListColaboradorQueryDto) {
    const page = query.page ?? 1;
    const limit = query.limit ?? 20;

    const { data, total } = await this.service.list({
      page,
      limit,
      ativo: query.ativo,
      role: query.role,
      search: query.search,
    });

    return {
      pagination: buildPaginationMeta(total, page, limit),
      data: data.map(toColaboradorResponse),
    };
  }

  @Get(':id')
  @Roles(Role.ADMIN, Role.GERENTE)
  @ApiOperation({ summary: 'Buscar colaborador por ID' })
  @ApiResponse({ status: 200, type: ColaboradorResponseDto })
  @ApiResponse({ status: 404, description: 'Nao encontrado' })
  async findOne(@Param('id', new ParseUUIDPipe()) id: string) {
    const c = await this.service.findById(id);
    return toColaboradorResponse(c);
  }

  @Post()
  @Roles(Role.ADMIN)
  @ApiOperation({ summary: 'Criar colaborador (ADMIN)' })
  @ApiResponse({ status: 201, type: ColaboradorResponseDto })
  @ApiResponse({ status: 409, description: 'Email/CPF/registro ja cadastrado' })
  async create(@Body() dto: CreateColaboradorDto) {
    const c = await this.service.create(dto);
    return toColaboradorResponse(c);
  }

  @Patch(':id')
  @Roles(Role.ADMIN, Role.GERENTE)
  @ApiOperation({
    summary: 'Atualizar colaborador',
    description:
      'Somente ADMIN altera papel, status (ativo) ou a senha de outra pessoa. ' +
      'Um GERENTE nao pode alterar um ADMIN.',
  })
  @ApiResponse({ status: 200, type: ColaboradorResponseDto })
  @ApiResponse({ status: 403, description: 'Alteracao privilegiada negada' })
  @ApiResponse({
    status: 409,
    description: 'Deixaria o sistema sem ADMIN ativo',
  })
  async update(
    @Param('id', new ParseUUIDPipe()) id: string,
    @Body() dto: UpdateColaboradorDto,
    @CurrentUser() ator: AuthenticatedUser,
  ) {
    const c = await this.service.update(id, dto, ator);
    return toColaboradorResponse(c);
  }

  @Delete(':id')
  @Roles(Role.ADMIN)
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Desativar colaborador (soft delete, ADMIN)' })
  @ApiResponse({ status: 204 })
  @ApiResponse({
    status: 409,
    description: 'Deixaria o sistema sem ADMIN ativo',
  })
  async remove(@Param('id', new ParseUUIDPipe()) id: string) {
    await this.service.delete(id);
  }
}
