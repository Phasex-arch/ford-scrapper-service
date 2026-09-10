import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, IsString, MaxLength } from 'class-validator';
import { PaginationQueryDto } from '../../../common/dto/pagination.dto.js';

/** Filtros de GET /metas — ver ListClienteQueryDto. */
export class ListMetaQueryDto extends PaginationQueryDto {
  @ApiPropertyOptional({ example: 'Abril/2026' })
  @IsOptional()
  @IsString()
  @MaxLength(40)
  periodo?: string;

  @ApiPropertyOptional({ example: 'vendas' })
  @IsOptional()
  @IsString()
  @MaxLength(40)
  indicador?: string;
}
