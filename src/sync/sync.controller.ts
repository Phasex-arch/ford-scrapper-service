import { Controller, Get, Logger, Post, Query } from '@nestjs/common';
import { ApiOperation, ApiQuery, ApiResponse, ApiTags } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsInt, IsOptional, Max, Min } from 'class-validator';
import { SyncService } from './sync.service.js';
import { Roles } from '../common/decorators/roles.decorator.js';
import { Role } from '../common/enums/role.enum.js';

class HistoryQueryDto {
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(50)
  limit?: number;
}

@ApiTags('Sync')
@Controller('sync')
export class SyncController {
  private readonly logger = new Logger(SyncController.name);

  constructor(private readonly syncService: SyncService) {}

  @Post()
  @Roles(Role.ADMIN)
  @ApiOperation({
    summary:
      'Trigger a full sync — ADMIN only, idempotent and signature-protected',
  })
  @ApiResponse({
    status: 201,
    description: 'Sync completed with result summary',
  })
  @ApiResponse({
    status: 401,
    description: 'Missing/invalid signature or auth',
  })
  @ApiResponse({ status: 403, description: 'Role denied' })
  async triggerSync() {
    this.logger.log('POST /sync — triggering full sync');
    return this.syncService.executeSyncRun();
  }

  @Get('history')
  @Roles(Role.ANALISTA, Role.ADMIN)
  @ApiOperation({ summary: 'Get sync run history' })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  @ApiResponse({ status: 200, description: 'List of recent sync runs' })
  async getHistory(@Query() q: HistoryQueryDto) {
    return this.syncService.getSyncHistory(q.limit ?? 10);
  }
}
