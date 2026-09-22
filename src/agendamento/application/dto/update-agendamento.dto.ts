import { ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsDateString,
  IsEnum,
  IsOptional,
  IsString,
  IsUUID,
  MaxLength,
  MinLength,
} from 'class-validator';
import { AgendamentoStatus } from '../../../../generated/prisma/enums.js';

export class UpdateAgendamentoDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MinLength(2)
  @MaxLength(120)
  cliente?: string;

  @ApiPropertyOptional({ description: 'UUID de um Cliente real — quando informado, o nome de exibição vem do cadastro' })
  @IsOptional()
  @IsUUID()
  clienteId?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MinLength(2)
  @MaxLength(200)
  servico?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(120)
  tecnico?: string;

  @ApiPropertyOptional({ description: 'UUID de um Tecnico real — quando informado, o nome de exibição vem do cadastro' })
  @IsOptional()
  @IsUUID()
  tecnicoId?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsDateString()
  dataHora?: string;

  @ApiPropertyOptional({ enum: AgendamentoStatus })
  @IsOptional()
  @IsEnum(AgendamentoStatus)
  status?: AgendamentoStatus;

  @ApiPropertyOptional()
  @IsOptional()
  @IsUUID()
  leadId?: string;
}
