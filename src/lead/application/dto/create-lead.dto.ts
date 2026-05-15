import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  IsEnum,
  IsNumber,
  IsOptional,
  IsString,
  MaxLength,
  Min,
  MinLength,
} from 'class-validator';
import { LeadUrgencia } from '../../../../generated/prisma/enums.js';

export class CreateLeadDto {
  @ApiProperty({ example: 'L001' })
  @IsString()
  @MinLength(2)
  @MaxLength(20)
  codigo!: string;

  @ApiProperty({ example: 'Carlos Silva' })
  @IsString()
  @MaxLength(120)
  clienteNome!: string;

  @ApiProperty({ example: 'CS' })
  @IsString()
  @MaxLength(4)
  iniciais!: string;

  @ApiProperty({ example: 'Ford Ranger Storm 2026' })
  @IsString()
  @MaxLength(120)
  veiculoInteresse!: string;

  @ApiProperty({ example: 'Upgrade de picape' })
  @IsString()
  @MaxLength(500)
  necessidade!: string;

  @ApiProperty({ enum: LeadUrgencia })
  @IsEnum(LeadUrgencia)
  urgencia!: LeadUrgencia;

  @ApiProperty({ example: 299900 })
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  valorEstimado!: number;

  @ApiProperty({ example: '(11) 97788-4411' })
  @IsString()
  @MaxLength(20)
  telefone!: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(1000)
  insight?: string;
}
