import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
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
  MinLength,
} from 'class-validator';
import {
  CondicaoVeiculo,
  SegmentoVeiculo,
} from '../../../../generated/prisma/enums.js';

/**
 * Estados do item de estoque. A coluna no banco e String (legado), mas a API so
 * aceita a lista fechada — todo outro status do sistema e enum, e string livre
 * aqui deixava o campo sem contrato para o frontend.
 */
export enum EstoqueStatus {
  DISPONIVEL = 'Disponivel',
  RESERVADO = 'Reservado',
  VENDIDO = 'Vendido',
}

/** Teto de preco: R$ 1 bilhao. Acima disso e erro de digitacao ou ataque. */
export const PRECO_MAXIMO = 1_000_000_000;

/** Teto de itens e de tamanho por item da lista de opcionais. */
export const OPCIONAIS_MAX_ITENS = 40;
export const OPCIONAIS_MAX_TAMANHO = 80;

export class CreateEstoqueDto {
  @ApiPropertyOptional({
    example: 'E001',
    description: 'Opcional: o servidor gera a sequencia quando ausente.',
  })
  @IsOptional()
  @IsString()
  @MinLength(2)
  @MaxLength(20)
  codigo?: string;

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

  @ApiPropertyOptional({ enum: EstoqueStatus, default: EstoqueStatus.DISPONIVEL })
  @IsOptional()
  @IsEnum(EstoqueStatus)
  status?: EstoqueStatus;

  @ApiProperty({ example: 209900, maximum: PRECO_MAXIMO })
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  @Max(PRECO_MAXIMO)
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

  @ApiPropertyOptional({ default: 1, maximum: 10_000 })
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
