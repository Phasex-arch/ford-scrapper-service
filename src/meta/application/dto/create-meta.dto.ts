import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  IsBoolean,
  IsNumber,
  IsOptional,
  IsString,
  IsUUID,
  MaxLength,
  MinLength,
  ValidateIf,
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

  @ApiPropertyOptional({
    description: 'UUID do colaborador responsável — se ausente/null, a meta é de loja/equipe (dado real da loja inteira no período)',
    nullable: true,
  })
  @IsOptional()
  @ValidateIf((o) => o.responsavelId !== null)
  @IsUUID()
  responsavelId?: string | null;

  @ApiPropertyOptional({ default: false })
  @IsOptional()
  @IsBoolean()
  lowerIsBetter?: boolean;
}
