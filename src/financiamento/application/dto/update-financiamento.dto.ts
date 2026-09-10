import { ApiPropertyOptional } from '@nestjs/swagger';
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
} from 'class-validator';
import { FinanciamentoStatus } from '../../../../generated/prisma/enums.js';
import {
  FIN_PRAZO_MAXIMO,
  FIN_TAXA_MAXIMA,
  FIN_VALOR_MAXIMO,
} from './create-financiamento.dto.js';

export class UpdateFinanciamentoDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(120)
  clienteNome?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(4)
  iniciais?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(120)
  veiculo?: string;

  @ApiPropertyOptional({ maximum: FIN_VALOR_MAXIMO })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  @Max(FIN_VALOR_MAXIMO)
  valor?: number;

  @ApiPropertyOptional({ maximum: FIN_VALOR_MAXIMO })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  @Max(FIN_VALOR_MAXIMO)
  entrada?: number;

  @ApiPropertyOptional({ maximum: FIN_PRAZO_MAXIMO })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(FIN_PRAZO_MAXIMO)
  prazo?: number;

  @ApiPropertyOptional({ maximum: FIN_TAXA_MAXIMA })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  @Max(FIN_TAXA_MAXIMA)
  taxa?: number;

  @ApiPropertyOptional({ maximum: FIN_VALOR_MAXIMO })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  @Max(FIN_VALOR_MAXIMO)
  parcela?: number;

  @ApiPropertyOptional({ enum: FinanciamentoStatus })
  @IsOptional()
  @IsEnum(FinanciamentoStatus)
  status?: FinanciamentoStatus;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(20)
  data?: string;
}
