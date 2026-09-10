import { ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsEnum, IsNumber, IsOptional, IsString, Max, MaxLength, Min } from 'class-validator';
import {
  CondicaoVeiculo,
  SegmentoVeiculo,
} from '../../../../generated/prisma/enums.js';
import { PaginationQueryDto } from '../../../common/dto/pagination.dto.js';
import { EstoqueStatus, PRECO_MAXIMO } from './create-estoque.dto.js';

/** Filtros de GET /estoque — ver ListClienteQueryDto para o porquê do DTO unico. */
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

  @ApiPropertyOptional({ enum: EstoqueStatus })
  @IsOptional()
  @IsEnum(EstoqueStatus)
  status?: EstoqueStatus;

  @ApiPropertyOptional({ minimum: 0, maximum: PRECO_MAXIMO })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  @Max(PRECO_MAXIMO)
  precoMin?: number;

  @ApiPropertyOptional({ minimum: 0, maximum: PRECO_MAXIMO })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  @Max(PRECO_MAXIMO)
  precoMax?: number;
}
