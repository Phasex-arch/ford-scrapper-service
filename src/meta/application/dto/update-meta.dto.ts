import { ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  IsBoolean,
  IsNumber,
  IsOptional,
  IsString,
  Max,
  MaxLength,
  Min,
} from 'class-validator';
import { META_VALOR_MAXIMO } from './create-meta.dto.js';

export class UpdateMetaDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(120)
  titulo?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(40)
  periodo?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(40)
  indicador?: string;

  // ponytail: o realizado segue sendo lancado por PATCH (ADMIN/GERENTE, auditado),
  // agora com piso e teto. O certo seria derivar do indicador — nao existe no
  // schema de onde derivar ainda.
  @ApiPropertyOptional({ minimum: 0, maximum: META_VALOR_MAXIMO })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  @Max(META_VALOR_MAXIMO)
  atual?: number;

  @ApiPropertyOptional({ minimum: 0, maximum: META_VALOR_MAXIMO })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  @Max(META_VALOR_MAXIMO)
  alvo?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(20)
  unidade?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(120)
  responsavel?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  lowerIsBetter?: boolean;
}
