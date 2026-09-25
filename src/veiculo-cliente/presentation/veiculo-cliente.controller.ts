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
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiOperation,
  ApiParam,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';
import { ApiStandardErrors } from '../../common/swagger/api-standard-errors.decorator.js';
import { Role } from '../../../generated/prisma/enums.js';
import { Roles } from '../../auth/infrastructure/decorators/roles.decorator.js';
import { RolesGuard } from '../../auth/infrastructure/guards/roles.guard.js';
import { AuditInterceptor } from '../../common/interceptors/audit.interceptor.js';
import { VeiculoClienteService } from '../application/veiculo-cliente.service.js';
import { CreateVeiculoClienteDto } from '../application/dto/create-veiculo-cliente.dto.js';
import { UpdateVeiculoClienteDto } from '../application/dto/update-veiculo-cliente.dto.js';

/**
 * Histórico de veículos de um cliente (o que a aba Histórico do dealership
 * exibe). Rotas aninhadas em /clientes/:clienteId/veiculos para listar e
 * criar; get/patch/delete de um item específico ficam em /veiculos-cliente/:id
 * porque o id já é globalmente único, sem precisar do clienteId na rota.
 */
@ApiTags('Histórico de veículos')
@ApiStandardErrors()
@ApiBearerAuth()
@UseGuards(RolesGuard)
@UseInterceptors(AuditInterceptor)
@Controller()
export class VeiculoClienteController {
  constructor(private readonly service: VeiculoClienteService) {}

  @Get('clientes/:clienteId/veiculos')
  @Roles(Role.ADMIN, Role.GERENTE, Role.FUNCIONARIO)
  @ApiOperation({ summary: 'Listar veículos (histórico de posse) de um cliente' })
  @ApiParam({ name: 'clienteId', format: 'uuid' })
  @ApiResponse({ status: 200, description: 'Lista de veículos do cliente' })
  list(@Param('clienteId', new ParseUUIDPipe()) clienteId: string) {
    return this.service.listByCliente(clienteId);
  }

  @Post('clientes/:clienteId/veiculos')
  @Roles(Role.ADMIN, Role.GERENTE)
  @ApiOperation({ summary: 'Registrar um veículo adquirido pelo cliente' })
  @ApiParam({ name: 'clienteId', format: 'uuid' })
  @ApiResponse({ status: 201, description: 'Veículo registrado' })
  create(
    @Param('clienteId', new ParseUUIDPipe()) clienteId: string,
    @Body() dto: CreateVeiculoClienteDto,
  ) {
    return this.service.create(clienteId, dto);
  }

  @Get('veiculos-cliente/:id')
  @Roles(Role.ADMIN, Role.GERENTE, Role.FUNCIONARIO)
  @ApiOperation({ summary: 'Buscar um registro de veículo de cliente por UUID' })
  @ApiParam({ name: 'id', format: 'uuid' })
  @ApiResponse({ status: 200 })
  findOne(@Param('id', new ParseUUIDPipe()) id: string) {
    return this.service.findById(id);
  }

  @Patch('veiculos-cliente/:id')
  @Roles(Role.ADMIN, Role.GERENTE)
  @ApiOperation({ summary: 'Atualizar um registro de veículo de cliente' })
  @ApiParam({ name: 'id', format: 'uuid' })
  @ApiResponse({ status: 200 })
  update(
    @Param('id', new ParseUUIDPipe()) id: string,
    @Body() dto: UpdateVeiculoClienteDto,
  ) {
    return this.service.update(id, dto);
  }

  @Delete('veiculos-cliente/:id')
  @Roles(Role.ADMIN, Role.GERENTE)
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Remover um registro de veículo de cliente' })
  @ApiParam({ name: 'id', format: 'uuid' })
  @ApiResponse({ status: 204 })
  async remove(@Param('id', new ParseUUIDPipe()) id: string) {
    await this.service.delete(id);
  }
}
