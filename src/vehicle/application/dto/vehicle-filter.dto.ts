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
  @IsOptional()
  @IsString()
  @MaxLength(40)
  @Matches(SAFE_TEXT_RE, { message: 'categoria contém caracteres inválidos' })
  categoria?: string;

  @IsOptional()
  @IsString()
  @MaxLength(40)
  @Matches(SAFE_TEXT_RE, { message: 'modelo contém caracteres inválidos' })
  modelo?: string;

  @IsOptional()
  @IsString()
  @MaxLength(60)
  @Matches(SAFE_TEXT_RE, { message: 'versao contém caracteres inválidos' })
  versao?: string;

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

  @IsOptional()
  @IsString()
  @MaxLength(40)
  @Matches(SAFE_TEXT_RE, { message: 'combustivel contém caracteres inválidos' })
  combustivel?: string;

  @IsOptional()
  @IsString()
  @MaxLength(20)
  @Matches(SAFE_TEXT_RE, { message: 'tracao contém caracteres inválidos' })
  tracao?: string;

  @IsOptional()
  @IsString()
  @MaxLength(40)
  @Matches(SAFE_TEXT_RE, { message: 'transmissao contém caracteres inválidos' })
  transmissao?: string;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  @Max(MAX_PRICE)
  preco_min?: number;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  @Max(MAX_PRICE)
  preco_max?: number;

  @IsOptional()
  @IsEnum(SortOrder, { message: 'sort deve ser preco_asc ou preco_desc' })
  sort?: SortOrder;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(10_000)
  page?: number;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(100)
  limit?: number;
}
