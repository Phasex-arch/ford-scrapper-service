import { Type } from 'class-transformer';
import {
  IsArray,
  IsInt,
  IsNumber,
  IsOptional,
  IsString,
  IsUrl,
  Max,
  MaxLength,
  Min,
  ValidateNested,
} from 'class-validator';

/**
 * Payload de ingestao do scraper. Era uma `interface`, ou seja, nada validava o
 * que o LLM devolve antes de virar linha em `Vehicle`/`Imagem`/`Fontes` — e
 * essas colunas sao servidas por `GET /api/vehicles`. Como esse caminho nao
 * passa por controller, a validacao e disparada no `VehicleService.save`.
 */
export class MotorizacaoDto {
  @IsString()
  @MaxLength(200)
  descricao!: string;

  @IsString()
  @MaxLength(60)
  combustivel!: string;

  @IsInt()
  @Min(0)
  @Max(2000)
  potencia_cv!: number;

  @IsInt()
  @Min(0)
  @Max(5000)
  torque_nm!: number;

  @IsString()
  @MaxLength(60)
  tracao!: string;

  @IsString()
  @MaxLength(60)
  transmissao!: string;
}

export class CorDto {
  @IsString()
  @MaxLength(120)
  nome!: string;

  @IsOptional()
  @IsString()
  @MaxLength(60)
  codigo!: string | null;

  @IsString()
  @MaxLength(60)
  disponibilidade!: string;
}

export class ImagemDto {
  @IsString()
  @MaxLength(60)
  tipo!: string;

  @IsUrl({ protocols: ['http', 'https'], require_protocol: true })
  @MaxLength(2048)
  url!: string;
}

export class FontesDto {
  @IsUrl({ protocols: ['http', 'https'], require_protocol: true })
  @MaxLength(2048)
  modelo_url!: string;

  @IsOptional()
  @IsUrl({ protocols: ['http', 'https'], require_protocol: true })
  @MaxLength(2048)
  versao_url!: string | null;

  @IsOptional()
  @IsUrl({ protocols: ['http', 'https'], require_protocol: true })
  @MaxLength(2048)
  ficha_tecnica_url!: string | null;

  @IsString()
  @MaxLength(2048)
  cores_url!: string;
}

export class CreateVehicleDto {
  @IsString()
  @MaxLength(200)
  slug!: string;

  @IsString()
  @MaxLength(120)
  categoria_principal!: string;

  @IsOptional()
  @IsString()
  @MaxLength(120)
  categoria_secundaria!: string | null;

  @IsString()
  @MaxLength(120)
  tipo_veiculo!: string;

  @IsString()
  @MaxLength(120)
  familia!: string;

  @IsString()
  @MaxLength(120)
  modelo!: string;

  @IsString()
  @MaxLength(200)
  versao!: string;

  @IsInt()
  @Min(1900)
  @Max(2100)
  ano_modelo!: number;

  @IsString()
  @MaxLength(60)
  status!: string;

  @IsOptional()
  @IsNumber()
  @Min(0)
  preco_inicial!: number | null;

  @IsOptional()
  @IsNumber()
  @Min(0)
  basePrice!: number | null;

  @IsString()
  @MaxLength(10)
  currency!: string;

  @IsOptional()
  @IsString()
  @MaxLength(2000)
  observacao!: string | null;

  @ValidateNested()
  @Type(() => MotorizacaoDto)
  motorizacao!: MotorizacaoDto;

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => CorDto)
  cores!: CorDto[];

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => ImagemDto)
  imagens!: ImagemDto[];

  @ValidateNested()
  @Type(() => FontesDto)
  fontes!: FontesDto;
}
