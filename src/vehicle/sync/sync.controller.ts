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

@ApiTags('Sincronização')
@ApiBearerAuth('JWT')
@UseGuards(RolesGuard)
@Controller('sync')
export class SyncController {
  private readonly logger = new Logger(SyncController.name);

  constructor(private readonly syncService: SyncService) {}

  @Post()
  @Roles(Role.ADMIN)
  @ApiOperation({
    summary: 'Disparar sincronização completa — somente ADMIN',
  })
  @ApiResponse({
    status: 201,
    description: 'Sincronização concluída com resumo do resultado',
  })
  @ApiResponse({
    status: 401,
    description: 'Token de autenticação ausente ou inválido',
  })
  @ApiResponse({ status: 403, description: 'Perfil sem permissão' })
  async triggerSync() {
    this.logger.log('POST /sync — triggering full sync');
    return this.syncService.executeSyncRun();
  }

  @Get('history')
  @Roles(Role.ADMIN, Role.GERENTE)
  @ApiOperation({ summary: 'Consultar histórico de sincronizações (ADMIN/GERENTE)' })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  @ApiResponse({ status: 200, description: 'Lista das sincronizações recentes' })
  async getHistory(@Query() q: HistoryQueryDto) {
    return this.syncService.getSyncHistory(q.limit ?? 10);
  }
}
