import { Body, Controller, Get, Patch, UseGuards, UseInterceptors } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import { Role } from '../../../generated/prisma/enums.js';
import { Roles } from '../../auth/infrastructure/decorators/roles.decorator.js';
import { RolesGuard } from '../../auth/infrastructure/guards/roles.guard.js';
import { AuditInterceptor } from '../../common/interceptors/audit.interceptor.js';
import { ConfiguracoesService } from '../application/configuracoes.service.js';
import { UpdateConcessionariaDto } from '../application/dto/update-concessionaria.dto.js';

@ApiTags('Configurações')
@ApiBearerAuth()
@Controller('configuracoes')
@UseGuards(RolesGuard)
@UseInterceptors(AuditInterceptor)
export class ConfiguracoesController {
  constructor(private readonly service: ConfiguracoesService) {}

  @Get('concessionaria')
  @Roles(Role.ADMIN, Role.GERENTE, Role.FUNCIONARIO)
  @ApiOperation({ summary: 'Dados cadastrais da concessionária' })
  @ApiResponse({ status: 200 })
  findConcessionaria() {
    return this.service.findConcessionaria();
  }

  @Patch('concessionaria')
  @Roles(Role.ADMIN, Role.GERENTE)
  @ApiOperation({ summary: 'Atualizar dados cadastrais da concessionária' })
  @ApiResponse({ status: 200 })
  updateConcessionaria(@Body() dto: UpdateConcessionariaDto) {
    return this.service.updateConcessionaria(dto);
  }

  @Get('seguranca')
  @Roles(Role.ADMIN, Role.GERENTE, Role.FUNCIONARIO)
  @ApiOperation({ summary: 'Status real de segurança (auditoria, expiração de sessão)' })
  @ApiResponse({ status: 200 })
  seguranca() {
    return this.service.seguranca();
  }
}
