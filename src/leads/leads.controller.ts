import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  ParseUUIDPipe,
  Post,
  Query,
} from '@nestjs/common';
import { ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import { LeadsService } from './leads.service.js';
import { CreateLeadDto } from './dto/create-lead.dto.js';
import { ListLeadsQueryDto } from './dto/list-leads-query.dto.js';
import { Roles } from '../common/decorators/roles.decorator.js';
import { Role } from '../common/enums/role.enum.js';
import { CurrentUser } from '../common/decorators/current-user.decorator.js';
import type { AuthenticatedUser } from '../common/decorators/current-user.decorator.js';

@ApiTags('Leads')
@Controller('leads')
export class LeadsController {
  constructor(private readonly leads: LeadsService) {}

  @Post()
  @Roles(Role.ANALISTA, Role.ADMIN)
  @ApiOperation({
    summary: 'Create a lead with PII fields (AES-256-GCM at rest)',
  })
  @ApiResponse({ status: 201 })
  @ApiResponse({ status: 409, description: 'CPF already registered' })
  create(@Body() dto: CreateLeadDto, @CurrentUser() user: AuthenticatedUser) {
    return this.leads.create(dto, user.id);
  }

  @Get()
  @Roles(Role.ANALISTA, Role.ADMIN)
  @ApiOperation({ summary: 'List leads (no PII in response)' })
  list(@Query() q: ListLeadsQueryDto) {
    return this.leads.list(q.page ?? 1, q.limit ?? 20, q.email);
  }

  @Get('export/pseudonymized')
  @Roles(Role.ANALISTA, Role.ADMIN)
  @ApiOperation({
    summary: 'Pseudonymized export for ML / dashboards (no nome/email/cpf)',
  })
  exportPseudo() {
    return this.leads.exportPseudonymized();
  }

  @Get(':id')
  @Roles(Role.ANALISTA, Role.ADMIN)
  @ApiOperation({ summary: 'Get a lead without decrypting PII' })
  findOne(@Param('id', new ParseUUIDPipe()) id: string) {
    return this.leads.findOne(id);
  }

  @Get(':id/pii')
  @Roles(Role.ADMIN)
  @ApiOperation({
    summary: 'Get a lead WITH decrypted CPF/telefone (ADMIN only, audited)',
  })
  findOneWithPii(@Param('id', new ParseUUIDPipe()) id: string) {
    return this.leads.findOneWithPii(id);
  }

  @Post(':id/anonymize')
  @Roles(Role.ADMIN)
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Irreversibly anonymize a lead (LGPD art. 18 IV)' })
  anonymize(@Param('id', new ParseUUIDPipe()) id: string) {
    return this.leads.anonymize(id);
  }

  @Delete(':id')
  @Roles(Role.ADMIN)
  @ApiOperation({
    summary: 'Physically delete a lead (LGPD right to be forgotten)',
  })
  remove(@Param('id', new ParseUUIDPipe()) id: string) {
    return this.leads.delete(id);
  }
}
