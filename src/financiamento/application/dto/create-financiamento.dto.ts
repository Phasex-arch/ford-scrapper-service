import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
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
import { FinanciamentoStatus } from '../../../../generated/prisma/enums.js';

/** Tetos do contrato: R$ 1 bi de valor, 120 meses de prazo, 100% de taxa mensal. */
export const FIN_VALOR_MAXIMO = 1_000_000_000;
export const FIN_PRAZO_MAXIMO = 120;
export const FIN_TAXA_MAXIMA = 100;

export class CreateFinanciamentoDto {
  @ApiPropertyOptional({
    example: 'F001',
    description: 'Opcional: o servidor gera a sequencia quando ausente.',
  })
  @IsOptional()
  @IsString()
  @MinLength(2)
  @MaxLength(20)
  codigo?: string;

  @ApiProperty({ example: 'Carlos Eduardo Mendes' })
  @IsString()
  @MaxLength(120)
  clienteNome!: string;

  @ApiProperty({ example: 'CM' })
  @IsString()
  @MaxLength(4)
  iniciais!: string;

  @ApiProperty({ example: 'Bronco Sport Badlands 2024' })
  @IsString()
  @MaxLength(120)
  veiculo!: string;

  @ApiProperty({ example: 189900, maximum: FIN_VALOR_MAXIMO })
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  @Max(FIN_VALOR_MAXIMO)
  valor!: number;

  @ApiProperty({ example: 38000, maximum: FIN_VALOR_MAXIMO })
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  @Max(FIN_VALOR_MAXIMO)
  entrada!: number;

  @ApiProperty({ example: 48, maximum: FIN_PRAZO_MAXIMO })
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(FIN_PRAZO_MAXIMO)
  prazo!: number;

  @ApiProperty({ example: 1.49, maximum: FIN_TAXA_MAXIMA })
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  @Max(FIN_TAXA_MAXIMA)
  taxa!: number;

  /** Conferida no servidor contra a tabela Price — ver FinanciamentoService. */
  @ApiProperty({ example: 3842, maximum: FIN_VALOR_MAXIMO })
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  @Max(FIN_VALOR_MAXIMO)
  parcela!: number;

  @ApiPropertyOptional({
    enum: FinanciamentoStatus,
    default: FinanciamentoStatus.ANALISE,
  })
  @IsOptional()
  @IsEnum(FinanciamentoStatus)
  status?: FinanciamentoStatus;

  @ApiProperty({ example: 'Mar 2024' })
  @IsString()
  @MaxLength(20)
  data!: string;
}
