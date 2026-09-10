import { ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  IsEnum,
  IsNumber,
  IsOptional,
  IsString,
  MaxLength,
  Min,
} from 'class-validator';
import { LeadUrgencia } from '../../../../generated/prisma/enums.js';
import { SanitizeFreeText } from '../../../common/sanitizers/sanitize-free-text.decorator.js';

export class UpdateLeadDto {
  @ApiPropertyOptional()
  @IsOptional()
  @SanitizeFreeText(120)
  @IsString()
  @MaxLength(120)
  clienteNome?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(4)
  iniciais?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @SanitizeFreeText(120)
  @IsString()
  @MaxLength(120)
  veiculoInteresse?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @SanitizeFreeText(500)
  @IsString()
  @MaxLength(500)
  necessidade?: string;

  @ApiPropertyOptional({ enum: LeadUrgencia })
  @IsOptional()
  @IsEnum(LeadUrgencia)
  urgencia?: LeadUrgencia;

  @ApiPropertyOptional()
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  valorEstimado?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(20)
  telefone?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(1000)
  insight?: string;
}
