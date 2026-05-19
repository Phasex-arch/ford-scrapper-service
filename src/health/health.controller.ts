import { Controller, Get } from '@nestjs/common';
import { ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import { Public } from '../auth/infrastructure/decorators/public.decorator.js';

@ApiTags('Health')
@Controller('health')
export class HealthController {
  private readonly startedAt = new Date();

  @Public()
  @Get()
  @ApiOperation({ summary: 'API health check (public)' })
  @ApiResponse({ status: 200, description: 'Service is healthy' })
  check() {
    const uptimeMs = Date.now() - this.startedAt.getTime();
    const uptimeSeconds = Math.floor(uptimeMs / 1000);
    const hours = Math.floor(uptimeSeconds / 3600);
    const minutes = Math.floor((uptimeSeconds % 3600) / 60);
    const seconds = uptimeSeconds % 60;

    return {
      status: 'ok',
      service: 'ford-scrapper-service',
      version: '1.0.0',
      timestamp: new Date().toISOString(),
      uptime: `${hours}h ${minutes}m ${seconds}s`,
      uptime_ms: uptimeMs,
    };
  }
}
