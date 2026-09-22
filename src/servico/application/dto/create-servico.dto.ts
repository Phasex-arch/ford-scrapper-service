import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  IsEnum,
  IsISO8601,
  IsNumber,
  IsOptional,
  IsString,
  IsUUID,
  MaxLength,
  Min,
  MinLength,
} from 'class-validator';
import { OrdemServicoStatus } from '../../../../generated/prisma/enums.js';

export class CreateServicoDto {
  @ApiPropertyOptional({
    example: '#4831',
    description: 'Gerado pelo servidor se omitido — nunca confie em número gerado no cliente',
  })
  @IsOptional()
  @IsString()
  @MinLength(2)
  @MaxLength(20)
  numero?: string;

  @ApiPropertyOptional({
    example: 'Carlos Mendes',
    description: 'Obrigatório só quando clienteId não é informado',
  })
  @IsOptional()
  @IsString()
  @MaxLength(120)
  cliente?: string;

  @ApiPropertyOptional({ description: 'UUID de um Cliente real — quando informado, o nome de exibição vem do cadastro' })
  @IsOptional()
  @IsUUID()
  clienteId?: string;

  @ApiProperty({ example: 'Bronco Sport 2024' })
  @IsString()
  @MaxLength(120)
  veiculo!: string;

  @ApiProperty({ example: 'Revisao 20.000 km' })
  @IsString()
  @MaxLength(200)
  tipo!: string;

  @ApiPropertyOptional({
    example: 'Andre Souza',
    description: 'Obrigatório só quando tecnicoId não é informado',
  })
  @IsOptional()
  @IsString()
  @MaxLength(120)
  tecnico?: string;

  @ApiPropertyOptional({ description: 'UUID de um Tecnico real — quando informado, o nome de exibição vem do cadastro' })
  @IsOptional()
  @IsUUID()
  tecnicoId?: string;

  @ApiProperty({
    example: '2026-09-25T14:00:00.000Z',
    description: 'Data/hora real do prazo (ISO 8601, UTC) — prazo (texto) e prioridade são calculados pelo servidor a partir daqui, nunca informados pelo cliente',
  })
  @IsISO8601()
  prazoData!: string;

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
