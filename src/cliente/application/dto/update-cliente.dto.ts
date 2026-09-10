import { ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  IsDateString,
  IsEmail,
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
import { ClienteStatus } from '../../../../generated/prisma/enums.js';

export class UpdateClienteDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MinLength(3)
  @MaxLength(120)
  nome?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MinLength(8)
  @MaxLength(20)
  telefone?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsEmail()
  @MaxLength(120)
  email?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsDateString()
  ultimaVisita?: string;

  @ApiPropertyOptional({ enum: ClienteStatus })
  @IsOptional()
  @IsEnum(ClienteStatus)
  status?: ClienteStatus;

  // ponytail: derivados corrigiveis por PATCH com teto. O certo e calcular a
  // partir dos contratos/veiculos do cliente; so que hoje Financiamento nao tem
  // relacao com Cliente (liga por nome), entao nao da para derivar no servidor.
  @ApiPropertyOptional({ maximum: 1000 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  @Max(1000)
  veiculosCount?: number;

  @ApiPropertyOptional({ maximum: 1_000_000_000 })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  @Max(1_000_000_000)
  ltv?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MinLength(1)
  @MaxLength(4)
  iniciais?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(40)
  segmento?: string;
}
