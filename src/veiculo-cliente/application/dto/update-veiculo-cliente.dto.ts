import { ApiPropertyOptional } from '@nestjs/swagger';
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
} from 'class-validator';
import { VeiculoClienteStatus } from '../../../../generated/prisma/enums.js';

export class UpdateVeiculoClienteDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsUUID()
  estoqueVeiculoId?: string;

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
  @MaxLength(60)
  cor?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(20)
  km?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(500)
  imagem?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  precoAquisicao?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsDateString()
  dataAquisicao?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsDateString()
  dataSaida?: string;

  @ApiPropertyOptional({ enum: VeiculoClienteStatus })
  @IsOptional()
  @IsEnum(VeiculoClienteStatus)
  status?: VeiculoClienteStatus;

  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  atual?: boolean;
}
