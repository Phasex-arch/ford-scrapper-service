import { ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  ArrayMaxSize,
  IsArray,
  IsEnum,
  IsInt,
  IsNumber,
  IsOptional,
  IsString,
  Max,
  MaxLength,
  Min,
} from 'class-validator';
import {
  CondicaoVeiculo,
  SegmentoVeiculo,
} from '../../../../generated/prisma/enums.js';
import {
  EstoqueStatus,
  OPCIONAIS_MAX_ITENS,
  OPCIONAIS_MAX_TAMANHO,
  PRECO_MAXIMO,
} from './create-estoque.dto.js';

export class UpdateEstoqueDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(120)
  modelo?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(160)
  versao?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(10)
  ano?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(120)
  motor?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(60)
  transmissao?: string;

  @ApiPropertyOptional({ enum: CondicaoVeiculo })
  @IsOptional()
  @IsEnum(CondicaoVeiculo)
  condicao?: CondicaoVeiculo;

  @ApiPropertyOptional({ enum: EstoqueStatus })
  @IsOptional()
  @IsEnum(EstoqueStatus)
  status?: EstoqueStatus;

  @ApiPropertyOptional({ maximum: PRECO_MAXIMO })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  @Max(PRECO_MAXIMO)
  preco?: number;

  @ApiPropertyOptional({ enum: SegmentoVeiculo })
  @IsOptional()
  @IsEnum(SegmentoVeiculo)
  segmento?: SegmentoVeiculo;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(60)
  cor?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(500)
  imagem?: string;

  @ApiPropertyOptional({ maximum: 10_000 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  @Max(10_000)
  quantidade?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(20)
  km?: string;

  @ApiPropertyOptional({ type: [String], maxItems: OPCIONAIS_MAX_ITENS })
  @IsOptional()
  @IsArray()
  @ArrayMaxSize(OPCIONAIS_MAX_ITENS)
  @IsString({ each: true })
  @MaxLength(OPCIONAIS_MAX_TAMANHO, { each: true })
  opcionais?: string[];
}
