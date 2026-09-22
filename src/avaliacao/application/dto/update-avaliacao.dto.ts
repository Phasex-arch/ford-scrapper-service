import { ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  IsEnum,
  IsInt,
  IsOptional,
  IsString,
  Max,
  MaxLength,
  Min,
  MinLength,
} from 'class-validator';
import { AvaliacaoStatus } from '../../../../generated/prisma/enums.js';

export class UpdateAvaliacaoDto {
  @ApiPropertyOptional({
    enum: AvaliacaoStatus,
    description: 'Moderação: aprova ou rejeita a avaliação pra ela (não) aparecer publicamente',
  })
  @IsOptional()
  @IsEnum(AvaliacaoStatus)
  status?: AvaliacaoStatus;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MinLength(3)
  @MaxLength(120)
  cliente?: string;

  @ApiPropertyOptional({ minimum: 1, maximum: 5 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(5)
  nota?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(20)
  data?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MinLength(5)
  @MaxLength(2000)
  texto?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(500)
  detalhe?: string;
}
