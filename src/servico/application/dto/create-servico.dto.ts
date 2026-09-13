import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  IsEnum,
  IsNumber,
  IsOptional,
  IsString,
  MaxLength,
  Min,
  MinLength,
} from 'class-validator';
import {
  OrdemServicoPrioridade,
  OrdemServicoStatus,
} from '../../../../generated/prisma/enums.js';

export class CreateServicoDto {
  @ApiProperty({ example: '#4831' })
  @IsString()
  @MinLength(2)
  @MaxLength(20)
  numero!: string;

  @ApiProperty({ example: 'Carlos Mendes' })
  @IsString()
  @MaxLength(120)
  cliente!: string;

  @ApiProperty({ example: 'Bronco Sport 2024' })
  @IsString()
  @MaxLength(120)
  veiculo!: string;

  @ApiProperty({ example: 'Revisao 20.000 km' })
  @IsString()
  @MaxLength(200)
  tipo!: string;

  @ApiProperty({ example: 'Andre Souza' })
  @IsString()
  @MaxLength(120)
  tecnico!: string;

  @ApiProperty({ example: 'Hoje, 14:00' })
  @IsString()
  @MaxLength(40)
  prazo!: string;

  @ApiPropertyOptional({
    enum: OrdemServicoPrioridade,
    default: OrdemServicoPrioridade.OK,
  })
  @IsOptional()
  @IsEnum(OrdemServicoPrioridade)
  prioridade?: OrdemServicoPrioridade;

  @ApiProperty({ example: 1840 })
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  valor!: number;

  @ApiPropertyOptional({
    enum: OrdemServicoStatus,
    default: OrdemServicoStatus.PREVISTO,
  })
  @IsOptional()
  @IsEnum(OrdemServicoStatus)
  status?: OrdemServicoStatus;
}
