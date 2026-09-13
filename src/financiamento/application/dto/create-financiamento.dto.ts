import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  IsEnum,
  IsInt,
  IsNumber,
  IsOptional,
  IsString,
  IsUUID,
  MaxLength,
  Min,
  MinLength,
} from 'class-validator';
import { FinanciamentoStatus } from '../../../../generated/prisma/enums.js';

export class CreateFinanciamentoDto {
  @ApiProperty({ example: 'F001' })
  @IsString()
  @MinLength(2)
  @MaxLength(20)
  codigo!: string;

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

  @ApiProperty({ example: 189900 })
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  valor!: number;

  @ApiProperty({ example: 38000 })
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  entrada!: number;

  @ApiProperty({ example: 48 })
  @Type(() => Number)
  @IsInt()
  @Min(1)
  prazo!: number;

  @ApiProperty({ example: 1.49 })
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  taxa!: number;

  @ApiProperty({ example: 3842 })
  @Type(() => Number)
  @IsNumber()
  @Min(0)
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

  @ApiPropertyOptional({
    description: 'UUID do lead que originou este financiamento, usado para calcular conversão',
  })
  @IsOptional()
  @IsUUID()
  leadId?: string;
}
