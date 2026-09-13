import { ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsInt, IsOptional, Max, Min } from 'class-validator';
import { PaginationQueryDto } from '../../../common/dto/pagination.dto.js';

/**
 * Ver o comentário em cliente/application/dto/list-clientes-query.dto.ts: os
 * filtros de listagem precisam viver no mesmo DTO que page/limit, senão o
 * ValidationPipe global (forbidNonWhitelisted) rejeita a query inteira com 400.
 */
export class ListAvaliacoesQueryDto extends PaginationQueryDto {
  @ApiPropertyOptional({ minimum: 1, maximum: 5 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(5)
  notaMin?: number;

  @ApiPropertyOptional({ minimum: 1, maximum: 5 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(5)
  notaMax?: number;
}
