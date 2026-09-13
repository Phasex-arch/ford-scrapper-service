import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsEnum, IsOptional, IsString, MaxLength } from 'class-validator';
import {
  OrdemServicoPrioridade,
  OrdemServicoStatus,
} from '../../../../generated/prisma/enums.js';
import { PaginationQueryDto } from '../../../common/dto/pagination.dto.js';

/**
 * Ver o comentário em cliente/application/dto/list-clientes-query.dto.ts: os
 * filtros de listagem precisam viver no mesmo DTO que page/limit, senão o
 * ValidationPipe global (forbidNonWhitelisted) rejeita a query inteira com 400.
 */
export class ListServicosQueryDto extends PaginationQueryDto {
  @ApiPropertyOptional({ enum: OrdemServicoStatus })
  @IsOptional()
  @IsEnum(OrdemServicoStatus)
  status?: OrdemServicoStatus;

  @ApiPropertyOptional({ enum: OrdemServicoPrioridade })
  @IsOptional()
  @IsEnum(OrdemServicoPrioridade)
  prioridade?: OrdemServicoPrioridade;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(120)
  tecnico?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(120)
  search?: string;
}
