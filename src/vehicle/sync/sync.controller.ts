import { Controller, Post, Get, Query, Logger } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiQuery } from '@nestjs/swagger';
import { SyncService } from './sync.service.js';

@ApiTags('Sync')
@Controller('sync')
export class SyncController {
  private readonly logger = new Logger(SyncController.name);

  constructor(private readonly syncService: SyncService) {}

  @Post()
  @ApiOperation({
    summary: 'Trigger a full sync: scrape Ford Brasil website and persist vehicles',
  })
  @ApiResponse({ status: 201, description: 'Sync completed with result summary' })
  async triggerSync() {
    this.logger.log('POST /sync — triggering full sync');
    return this.syncService.executeSyncRun();
  }

  @Get('history')
  @ApiOperation({ summary: 'Get sync run history' })
  @ApiQuery({
    name: 'limit',
    required: false,
    type: Number,
    description: 'Number of recent sync runs to return (default: 10)',
  })
  @ApiResponse({ status: 200, description: 'List of recent sync runs' })
  async getHistory(@Query('limit') limit?: string) {
    const limitNum = limit ? Math.min(parseInt(limit, 10), 50) : 10;
    return this.syncService.getSyncHistory(limitNum);
  }
}
