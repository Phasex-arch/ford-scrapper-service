import { ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  IsEnum,
  IsNumber,
  IsOptional,
  IsString,
  Min,
  MaxLength,
} from 'class-validator';
import {
  CondicaoVeiculo,
  SegmentoVeiculo,
} from '../../../../generated/prisma/enums.js';
import { PaginationQueryDto } from '../../../common/dto/pagination.dto.js';

/**
 * Ver o comentário em cliente/application/dto/list-clientes-query.dto.ts:
 * os filtros de listagem precisam viver no mesmo DTO que page/limit, senão o
 * ValidationPipe global (forbidNonWhitelisted) rejeita a query inteira com 400
 * assim que qualquer filtro é combinado com paginação.
 */
export class ListEstoqueQueryDto extends PaginationQueryDto {
  @ApiPropertyOptional({ enum: CondicaoVeiculo })
  @IsOptional()
  @IsEnum(CondicaoVeiculo)
  condicao?: CondicaoVeiculo;

  @ApiPropertyOptional({ enum: SegmentoVeiculo })
  @IsOptional()
  @IsEnum(SegmentoVeiculo)
  segmento?: SegmentoVeiculo;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(120)
  modelo?: string;

  @ApiPropertyOptional({ description: 'Busca livre em modelo, versão, cor e código' })
  @IsOptional()
  @IsString()
  @MaxLength(120)
  search?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(40)
  status?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  precoMin?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  precoMax?: number;
}
