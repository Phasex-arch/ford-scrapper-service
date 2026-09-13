import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, IsString, MaxLength } from 'class-validator';
import { PaginationQueryDto } from '../../../common/dto/pagination.dto.js';

/**
 * Ver o comentário em cliente/application/dto/list-clientes-query.dto.ts: os
 * filtros de listagem precisam viver no mesmo DTO que page/limit, senão o
 * ValidationPipe global (forbidNonWhitelisted) rejeita a query inteira com 400.
 */
export class ListMetasQueryDto extends PaginationQueryDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(40)
  periodo?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(40)
  indicador?: string;
}
