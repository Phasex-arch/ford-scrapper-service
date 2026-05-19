import { Controller, Get, Query } from '@nestjs/common';
import { ApiOperation, ApiQuery, ApiResponse, ApiTags } from '@nestjs/swagger';
import { AuditService } from './audit.service.js';
import { Roles } from '../common/decorators/roles.decorator.js';
import { Role } from '../common/enums/role.enum.js';
import { AuditQueryDto } from './dto/audit-query.dto.js';

@ApiTags('Audit')
@Controller()
export class AuditController {
  constructor(private readonly audit: AuditService) {}

  @Get('audit-logs')
  @Roles(Role.ADMIN)
  @ApiOperation({ summary: 'List recent audit log entries (ADMIN only)' })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  @ApiQuery({ name: 'action', required: false })
  @ApiQuery({ name: 'userId', required: false })
  @ApiResponse({ status: 200 })
  list(@Query() q: AuditQueryDto) {
    return this.audit.list(q.limit ?? 50, q.action, q.userId);
  }

  @Get('metrics')
  @Roles(Role.ADMIN)
  @ApiOperation({
    summary: 'Operational metrics aggregated from audit log (ADMIN only)',
  })
  metrics() {
    return this.audit.metrics();
  }
}
