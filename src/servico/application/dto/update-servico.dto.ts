import { ApiPropertyOptional } from '@nestjs/swagger';
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
} from 'class-validator';
import { OrdemServicoStatus } from '../../../../generated/prisma/enums.js';

export class UpdateServicoDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(120)
  cliente?: string;

  @ApiPropertyOptional({ description: 'UUID de um Cliente real — quando informado, o nome de exibição vem do cadastro' })
  @IsOptional()
  @IsUUID()
  clienteId?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(120)
  veiculo?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(200)
  tipo?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(120)
  tecnico?: string;

  @ApiPropertyOptional({ description: 'UUID de um Tecnico real — quando informado, o nome de exibição vem do cadastro' })
  @IsOptional()
  @IsUUID()
  tecnicoId?: string;

  @ApiPropertyOptional({
    example: '2026-09-25T14:00:00.000Z',
    description: 'Data/hora real do prazo (ISO 8601, UTC) — prazo (texto) e prioridade são recalculados pelo servidor quando informado',
  })
  @IsOptional()
  @IsISO8601()
  prazoData?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  valor?: number;

  @ApiPropertyOptional({ enum: OrdemServicoStatus })
  @IsOptional()
  @IsEnum(OrdemServicoStatus)
  status?: OrdemServicoStatus;
}
