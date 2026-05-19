import { Controller, Get, Logger, Post, Query, UseGuards } from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiOperation,
  ApiQuery,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsInt, IsOptional, Max, Min } from 'class-validator';
import { SyncService } from './sync.service.js';
import { Roles } from '../../auth/infrastructure/decorators/roles.decorator.js';
import { RolesGuard } from '../../auth/infrastructure/guards/roles.guard.js';
import { Role } from '../../../generated/prisma/enums.js';

class HistoryQueryDto {
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(50)
  limit?: number;
}

@ApiTags('Sync')
@ApiBearerAuth('JWT')
@UseGuards(RolesGuard)
@Controller('sync')
export class SyncController {
  private readonly logger = new Logger(SyncController.name);

  constructor(private readonly syncService: SyncService) {}

  @Post()
  @Roles(Role.ADMIN)
  @ApiOperation({
    summary: 'Trigger a full sync — ADMIN only',
  })
  @ApiResponse({
    status: 201,
    description: 'Sync completed with result summary',
  })
  @ApiResponse({
    status: 401,
    description: 'Missing/invalid auth token',
  })
  @ApiResponse({ status: 403, description: 'Role denied' })
  async triggerSync() {
    this.logger.log('POST /sync — triggering full sync');
    return this.syncService.executeSyncRun();
  }

  @Get('history')
  @Roles(Role.ADMIN, Role.GERENTE)
  @ApiOperation({ summary: 'Get sync run history (ADMIN/GERENTE)' })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  @ApiResponse({ status: 200, description: 'List of recent sync runs' })
  async getHistory(@Query() q: HistoryQueryDto) {
    return this.syncService.getSyncHistory(q.limit ?? 10);
  }
}
