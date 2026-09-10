import { ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsInt, IsOptional, Max, Min } from 'class-validator';
import { PaginationQueryDto } from '../../../common/dto/pagination.dto.js';

/**
 * Filtros de GET /avaliacoes.
 *
 * P1-2: o ValidationPipe global usa `forbidNonWhitelisted`, e um `@Query()` sem
 * chave valida o objeto de query INTEIRO contra o DTO. Com a paginacao sozinha
 * ali, `?notaMin=4` — documentado em @ApiQuery — devolvia 400. A faixa tambem
 * passa a ser validada: antes era `Number(...)` sem limite nenhum.
 */
export class ListAvaliacaoQueryDto extends PaginationQueryDto {
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
