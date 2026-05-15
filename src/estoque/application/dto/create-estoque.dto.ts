import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  IsArray,
  IsEnum,
  IsInt,
  IsNumber,
  IsOptional,
  IsString,
  MaxLength,
  Min,
  MinLength,
} from 'class-validator';
import {
  CondicaoVeiculo,
  SegmentoVeiculo,
} from '../../../../generated/prisma/enums.js';

export class CreateEstoqueDto {
  @ApiProperty({ example: 'E001' })
  @IsString()
  @MinLength(2)
  @MaxLength(20)
  codigo!: string;

  @ApiProperty({ example: 'Ford Bronco Sport' })
  @IsString()
  @MaxLength(120)
  modelo!: string;

  @ApiProperty({ example: 'Badlands 2.0 EcoBoost AT6' })
  @IsString()
  @MaxLength(160)
  versao!: string;

  @ApiProperty({ example: '2026' })
  @IsString()
  @MaxLength(10)
  ano!: string;

  @ApiProperty({ example: '2.0 EcoBoost 250 cv' })
  @IsString()
  @MaxLength(120)
  motor!: string;

  @ApiProperty({ example: 'Automatico 6 vel.' })
  @IsString()
  @MaxLength(60)
  transmissao!: string;

  @ApiProperty({ enum: CondicaoVeiculo })
  @IsEnum(CondicaoVeiculo)
  condicao!: CondicaoVeiculo;

  @ApiPropertyOptional({ default: 'Disponivel' })
  @IsOptional()
  @IsString()
  @MaxLength(40)
  status?: string;

  @ApiProperty({ example: 209900 })
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  preco!: number;

  @ApiProperty({ enum: SegmentoVeiculo })
  @IsEnum(SegmentoVeiculo)
  segmento!: SegmentoVeiculo;

  @ApiProperty({ example: 'Azul Arizona' })
  @IsString()
  @MaxLength(60)
  cor!: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(500)
  imagem?: string;

  @ApiPropertyOptional({ default: 1 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  quantidade?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(20)
  km?: string;

  @ApiPropertyOptional({ type: [String] })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  opcionais?: string[];
}
