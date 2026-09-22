import {
  BadRequestException,
  Controller,
  Get,
  Query,
  UseGuards,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiOperation,
  ApiQuery,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';
import { Role } from '../../../generated/prisma/enums.js';
import { Roles } from '../../auth/infrastructure/decorators/roles.decorator.js';
import { RolesGuard } from '../../auth/infrastructure/guards/roles.guard.js';
import {
  DashboardService,
  type DashPeriod,
} from '../application/dashboard.service.js';

const PERIODS: DashPeriod[] = ['hoje', 'semana', 'mes', 'trimestre', 'ano'];

@ApiTags('Dashboard')
@ApiBearerAuth()
@Controller('dashboard')
@UseGuards(RolesGuard)
export class DashboardController {
  constructor(private readonly service: DashboardService) {}

  @Get()
  @Roles(Role.ADMIN, Role.GERENTE, Role.FUNCIONARIO)
  @ApiOperation({ summary: 'KPIs agregados (tempo real)' })
  @ApiQuery({
    name: 'periodo',
    required: false,
    enum: PERIODS,
    description: 'Período do retrato. Padrão: mês',
  })
  @ApiResponse({ status: 200 })
  snapshot(@Query('periodo') periodo?: string) {
    const p = (periodo ?? 'mes') as DashPeriod;
    if (!PERIODS.includes(p)) {
      throw new BadRequestException(
        `Periodo invalido. Use um de: ${PERIODS.join(', ')}`,
      );
    }
    return this.service.snapshot(p);
  }

  @Get('receita')
  @Roles(Role.ADMIN, Role.GERENTE)
  @ApiOperation({ summary: 'Snapshot financeiro do mês corrente (tela de Receita, ADMIN/GERENTE)' })
  @ApiResponse({ status: 200 })
  receita() {
    return this.service.receita();
  }

  @Get('desempenho')
  @Roles(Role.ADMIN, Role.GERENTE)
  @ApiOperation({ summary: 'Snapshot de performance da equipe — conversão individual por consultor (tela de Desempenho, ADMIN/GERENTE)' })
  @ApiResponse({ status: 200 })
  desempenho() {
    return this.service.desempenho();
  }
}
