import { Controller, Get, Query, UseGuards, UseInterceptors } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiQuery, ApiResponse, ApiTags } from '@nestjs/swagger';
import { ApiStandardErrors } from '../../common/swagger/api-standard-errors.decorator.js';
import { Role } from '../../../generated/prisma/enums.js';
import { Roles } from '../../auth/infrastructure/decorators/roles.decorator.js';
import { RolesGuard } from '../../auth/infrastructure/guards/roles.guard.js';
import { AuditInterceptor } from '../../common/interceptors/audit.interceptor.js';
import { buildPaginationMeta, PaginationQueryDto } from '../../common/dto/pagination.dto.js';
import { AuditLogService } from '../application/audit-log.service.js';
import { AuditLogResponseDto, toAuditLogResponse } from '../application/dto/audit-log-response.dto.js';

/**
 * Leitura do log de auditoria — só ADMIN, já que expõe e-mail e ação de
 * todo mundo que escreveu algo no sistema. O AuditInterceptor grava as
 * linhas (POST/PATCH/PUT/DELETE em qualquer controller); este é o único
 * lugar que as lê de volta.
 */
@ApiTags('Auditoria')
@ApiStandardErrors()
@ApiBearerAuth()
@Controller('audit-log')
@UseGuards(RolesGuard)
@UseInterceptors(AuditInterceptor)
export class AuditLogController {
  constructor(private readonly service: AuditLogService) {}

  @Get()
  @Roles(Role.ADMIN)
  @ApiOperation({ summary: 'Listar log de auditoria (paginado, somente ADMIN)' })
  @ApiQuery({ name: 'resource', required: false })
  @ApiQuery({ name: 'action', required: false })
  @ApiResponse({ status: 200, description: 'Lista paginada de eventos de auditoria' })
  async list(
    @Query() pagination: PaginationQueryDto,
    @Query('resource') resource?: string,
    @Query('action') action?: string,
  ) {
    const page = pagination.page ?? 1;
    const limit = pagination.limit ?? 20;
    const { data, total } = await this.service.list({ page, limit, resource, action });
    return {
      pagination: buildPaginationMeta(total, page, limit),
      data: data.map((row): AuditLogResponseDto => toAuditLogResponse(row)),
    };
  }
}
