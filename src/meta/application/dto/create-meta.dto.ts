import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  IsBoolean,
  IsNumber,
  IsOptional,
  IsString,
  MaxLength,
  MinLength,
} from 'class-validator';

export class CreateMetaDto {
  @ApiProperty({ example: 'M001' })
  @IsString()
  @MinLength(2)
  @MaxLength(20)
  codigo!: string;

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

  @ApiProperty({ example: 22 })
  @Type(() => Number)
  @IsNumber()
  atual!: number;

  @ApiProperty({ example: 28 })
  @Type(() => Number)
  @IsNumber()
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
