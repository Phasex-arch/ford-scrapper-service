import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  IsBoolean,
  IsNumber,
  IsOptional,
  IsString,
  Max,
  MaxLength,
  Min,
  MinLength,
} from 'class-validator';

/** Teto dos valores de meta — acima disso e erro de digitacao ou abuso. */
export const META_VALOR_MAXIMO = 1_000_000_000;

export class CreateMetaDto {
  @ApiPropertyOptional({
    example: 'M001',
    description: 'Opcional: o servidor gera a sequencia quando ausente.',
  })
  @IsOptional()
  @IsString()
  @MinLength(2)
  @MaxLength(20)
  codigo?: string;

  @ApiProperty({ example: 'Vendas Mensais' })
  @IsString()
  @MaxLength(120)
  titulo!: string;

  @ApiProperty({ example: 'Abril/2026' })
  @IsString()
  @MaxLength(40)
  periodo!: string;

  @ApiProperty({ example: 'vendas' })
  @IsString()
  @MaxLength(40)
  indicador!: string;

  /**
   * Realizado da meta. Campo derivado: aceito no corpo por compatibilidade com
   * os clientes existentes, mas IGNORADO — toda meta nasce com `atual` 0. Sem
   * isso, qualquer um com metas:write criava uma meta ja batida.
   */
  @ApiPropertyOptional({
    readOnly: true,
    description: 'Ignorado na criacao: o realizado nasce em 0.',
  })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  @Max(META_VALOR_MAXIMO)
  atual?: number;

  @ApiProperty({ example: 28, minimum: 0, maximum: META_VALOR_MAXIMO })
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  @Max(META_VALOR_MAXIMO)
  alvo!: number;

  @ApiProperty({ example: 'un.' })
  @IsString()
  @MaxLength(20)
  unidade!: string;

  @ApiProperty({ example: 'Equipe Comercial' })
  @IsString()
  @MaxLength(120)
  responsavel!: string;

  @ApiPropertyOptional({ default: false })
  @IsOptional()
  @IsBoolean()
  lowerIsBetter?: boolean;
}
