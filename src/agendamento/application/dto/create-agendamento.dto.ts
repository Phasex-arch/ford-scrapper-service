import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsDateString,
  IsOptional,
  IsString,
  IsUUID,
  MaxLength,
  MinLength,
} from 'class-validator';

export class CreateAgendamentoDto {
  @ApiProperty({ example: 'Carlos Mendes' })
  @IsString()
  @MinLength(2)
  @MaxLength(120)
  cliente!: string;

  @ApiProperty({ example: 'Revisão 10.000 km' })
  @IsString()
  @MinLength(2)
  @MaxLength(200)
  servico!: string;

  @ApiPropertyOptional({ example: 'André Souza' })
  @IsOptional()
  @IsString()
  @MaxLength(120)
  tecnico?: string;

  @ApiProperty({ example: '2026-09-15T10:30:00.000Z' })
  @IsDateString()
  dataHora!: string;

  @ApiPropertyOptional({ description: 'UUID do lead que originou o agendamento' })
  @IsOptional()
  @IsUUID()
  leadId?: string;
}
