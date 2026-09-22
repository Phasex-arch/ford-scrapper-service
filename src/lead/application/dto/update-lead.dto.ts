import { ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  IsEmail,
  IsEnum,
  IsNumber,
  IsOptional,
  IsString,
  IsUUID,
  MaxLength,
  Min,
} from 'class-validator';
import { LeadUrgencia } from '../../../../generated/prisma/enums.js';

export class UpdateLeadDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(120)
  clienteNome?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(4)
  iniciais?: string;

  @ApiPropertyOptional({ description: 'Texto livre — obrigatório só quando estoqueVeiculoId não é informado' })
  @IsOptional()
  @IsString()
  @MaxLength(120)
  veiculoInteresse?: string;

  @ApiPropertyOptional({ description: 'UUID de um item real do estoque — quando informado, o texto de exibição vem do cadastro' })
  @IsOptional()
  @IsUUID()
  estoqueVeiculoId?: string;

  @ApiPropertyOptional()
  @IsOptional()
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
  @IsEmail()
  @MaxLength(120)
  email?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(1000)
  insight?: string;

  @ApiPropertyOptional({ description: 'UUID do colaborador responsável (consultor que assumiu o lead)' })
  @IsOptional()
  @IsUUID()
  responsavelId?: string;
}
