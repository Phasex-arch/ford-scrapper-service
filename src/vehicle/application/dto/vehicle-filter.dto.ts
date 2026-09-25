import { ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  IsEnum,
  IsInt,
  IsNumber,
  IsOptional,
  IsString,
  Matches,
  Max,
  MaxLength,
  Min,
} from 'class-validator';
import { SortOrder } from '../../../common/enums/sort.enum.js';

const SAFE_TEXT_RE = /^[\p{L}\p{N}\s\-./]+$/u;
const MAX_PRICE = 99_999_999;

export class VehicleFilterDto {
  @ApiPropertyOptional({ description: 'Categoria (ex.: SUV, Picape)' })
  @IsOptional()
  @IsString()
  @MaxLength(40)
  @Matches(SAFE_TEXT_RE, { message: 'categoria contém caracteres inválidos' })
  categoria?: string;

  @ApiPropertyOptional({ description: 'Modelo (ex.: Ranger)' })
  @IsOptional()
  @IsString()
  @MaxLength(40)
  @Matches(SAFE_TEXT_RE, { message: 'modelo contém caracteres inválidos' })
  modelo?: string;

  @ApiPropertyOptional({ description: 'Versão' })
  @IsOptional()
  @IsString()
  @MaxLength(60)
  @Matches(SAFE_TEXT_RE, { message: 'versao contém caracteres inválidos' })
  versao?: string;

  @ApiPropertyOptional({ description: 'Nome da cor' })
  @IsOptional()
  @IsString()
  @MaxLength(40)
  @Matches(SAFE_TEXT_RE, { message: 'cor contém caracteres inválidos' })
  cor?: string;

  @IsOptional()
  @IsString()
  @MaxLength(40)
  @Matches(SAFE_TEXT_RE, {
    message: 'tipo_veiculo contém caracteres inválidos',
  })
  tipo_veiculo?: string;

  @ApiPropertyOptional({ description: 'Combustível' })
  @IsOptional()
  @IsString()
  @MaxLength(40)
  @Matches(SAFE_TEXT_RE, { message: 'combustivel contém caracteres inválidos' })
  combustivel?: string;

  @ApiPropertyOptional({ description: 'Tração (ex.: 4x4)' })
  @IsOptional()
  @IsString()
  @MaxLength(20)
  @Matches(SAFE_TEXT_RE, { message: 'tracao contém caracteres inválidos' })
  tracao?: string;

  @ApiPropertyOptional({ description: 'Transmissão' })
  @IsOptional()
  @IsString()
  @MaxLength(40)
  @Matches(SAFE_TEXT_RE, { message: 'transmissao contém caracteres inválidos' })
  transmissao?: string;

  @ApiPropertyOptional({ description: 'Preço inicial mínimo (R$)' })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  @Max(MAX_PRICE)
  preco_min?: number;

  @ApiPropertyOptional({ description: 'Preço inicial máximo (R$)' })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  @Max(MAX_PRICE)
  preco_max?: number;

  @ApiPropertyOptional({ enum: SortOrder, description: 'Ordenação por preço' })
  @IsOptional()
  @IsEnum(SortOrder, { message: 'sort deve ser preco_asc ou preco_desc' })
  sort?: SortOrder;

  @ApiPropertyOptional({ description: 'Página (a partir de 1)' })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(10_000)
  page?: number;

  @ApiPropertyOptional({ description: 'Itens por página (1-100)' })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(100)
  limit?: number;
}
