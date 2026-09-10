import { ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  IsInt,
  IsOptional,
  IsString,
  Max,
  MaxLength,
  Min,
  MinLength,
} from 'class-validator';
import { SanitizeFreeText } from '../../../common/sanitizers/sanitize-free-text.decorator.js';

export class UpdateAvaliacaoDto {
  @ApiPropertyOptional()
  @IsOptional()
  @SanitizeFreeText(120)
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
  @SanitizeFreeText(2000)
  @IsString()
  @MinLength(5)
  @MaxLength(2000)
  texto?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @SanitizeFreeText(500)
  @IsString()
  @MaxLength(500)
  detalhe?: string;
}
