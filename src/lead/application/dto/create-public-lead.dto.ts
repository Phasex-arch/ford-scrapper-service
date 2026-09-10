import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  IsEmail,
  IsEnum,
  IsNumber,
  IsOptional,
  IsString,
  MaxLength,
  Min,
  MinLength,
} from 'class-validator';
import { LeadUrgencia } from '../../../../generated/prisma/enums.js';
import { SanitizeFreeText } from '../../../common/sanitizers/sanitize-free-text.decorator.js';

/** Payload intentionally separate from the authenticated lead CRUD DTO. */
export class CreatePublicLeadDto {
  @ApiProperty({ example: 'Carlos Silva' })
  @SanitizeFreeText(120)
  @IsString()
  @MinLength(3)
  @MaxLength(120)
  nome!: string;

  @ApiProperty({ example: 'carlos.silva@email.com' })
  @IsEmail()
  @MaxLength(120)
  email!: string;

  @ApiProperty({ example: '(11) 97788-4411' })
  @IsString()
  @MinLength(8)
  @MaxLength(20)
  telefone!: string;

  @ApiProperty({ example: 'Ford Ranger Storm' })
  @SanitizeFreeText(120)
  @IsString()
  @MinLength(2)
  @MaxLength(120)
  veiculoInteresse!: string;

  @ApiProperty({ example: 'Gostaria de receber uma proposta.' })
  @SanitizeFreeText(500)
  @IsString()
  @MinLength(5)
  @MaxLength(500)
  mensagem!: string;

  @ApiPropertyOptional({ enum: LeadUrgencia, default: LeadUrgencia.MEDIA })
  @IsOptional()
  @IsEnum(LeadUrgencia)
  urgencia?: LeadUrgencia;

  @ApiPropertyOptional({ example: 299900, minimum: 0 })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  valorEstimado?: number;
}
