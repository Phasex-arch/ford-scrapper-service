import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsEnum, IsOptional, IsString } from 'class-validator';
import { AgendamentoStatus } from '../../../../generated/prisma/enums.js';
import { PaginationQueryDto } from '../../../common/dto/pagination.dto.js';

/**
 * Ver o comentário em cliente/application/dto/list-clientes-query.dto.ts: os
 * filtros de listagem precisam viver no mesmo DTO que page/limit, senão o
 * ValidationPipe global (forbidNonWhitelisted) rejeita a query inteira com 400.
 */
export class ListAgendamentosQueryDto extends PaginationQueryDto {
  @ApiPropertyOptional({ description: 'Filtra por dia (YYYY-MM-DD)' })
  @IsOptional()
  @IsString()
  data?: string;

  @ApiPropertyOptional({ enum: AgendamentoStatus })
  @IsOptional()
  @IsEnum(AgendamentoStatus)
  status?: AgendamentoStatus;

  @ApiPropertyOptional({ description: 'UUID do lead' })
  @IsOptional()
  @IsString()
  leadId?: string;
}
