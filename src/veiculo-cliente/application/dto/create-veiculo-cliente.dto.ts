import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  IsBoolean,
  IsDateString,
  IsEnum,
  IsNumber,
  IsOptional,
  IsString,
  IsUUID,
  MaxLength,
  Min,
  MinLength,
} from 'class-validator';
import { VeiculoClienteStatus } from '../../../../generated/prisma/enums.js';

export class CreateVeiculoClienteDto {
  @ApiProperty({ example: 'VC001A' })
  @IsString()
  @MinLength(2)
  @MaxLength(30)
  codigo!: string;

  @ApiPropertyOptional({
    description: 'UUID do item de estoque de origem, se a venda partiu do estoque atual',
  })
  @IsOptional()
  @IsUUID()
  estoqueVeiculoId?: string;

  @ApiProperty({ example: 'Bronco Sport' })
  @IsString()
  @MaxLength(120)
  modelo!: string;

  @ApiProperty({ example: 'Badlands 2.0 EcoBoost AT6' })
  @IsString()
  @MaxLength(160)
  versao!: string;

  @ApiProperty({ example: '2024/2024' })
  @IsString()
  @MaxLength(10)
  ano!: string;

  @ApiProperty({ example: 'Azul Arizona' })
  @IsString()
  @MaxLength(60)
  cor!: string;

  @ApiPropertyOptional({ example: '12.450' })
  @IsOptional()
  @IsString()
  @MaxLength(20)
  km?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(500)
  imagem?: string;

  @ApiProperty({ example: 189900 })
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  precoAquisicao!: number;

  @ApiProperty({ example: '2024-03-15' })
  @IsDateString()
  dataAquisicao!: string;

  @ApiPropertyOptional({ example: '2026-03-01' })
  @IsOptional()
  @IsDateString()
  dataSaida?: string;

  @ApiPropertyOptional({ enum: VeiculoClienteStatus, default: VeiculoClienteStatus.ATIVO })
  @IsOptional()
  @IsEnum(VeiculoClienteStatus)
  status?: VeiculoClienteStatus;

  @ApiPropertyOptional({ default: true, description: 'Se é o veículo atual do cliente' })
  @IsOptional()
  @IsBoolean()
  atual?: boolean;
}
