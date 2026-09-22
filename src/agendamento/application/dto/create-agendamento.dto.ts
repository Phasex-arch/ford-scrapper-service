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
  @ApiPropertyOptional({
    example: 'Carlos Mendes',
    description: 'Obrigatório só quando clienteId não é informado (cliente avulso, sem cadastro)',
  })
  @IsOptional()
  @IsString()
  @MinLength(2)
  @MaxLength(120)
  cliente?: string;

  @ApiPropertyOptional({ description: 'UUID de um Cliente real — quando informado, o nome de exibição vem do cadastro' })
  @IsOptional()
  @IsUUID()
  clienteId?: string;

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

  @ApiPropertyOptional({ description: 'UUID de um Tecnico real — quando informado, o nome de exibição vem do cadastro' })
  @IsOptional()
  @IsUUID()
  tecnicoId?: string;

  @ApiProperty({ example: '2026-09-15T10:30:00.000Z' })
  @IsDateString()
  dataHora!: string;

  @ApiPropertyOptional({ description: 'UUID do lead que originou o agendamento' })
  @IsOptional()
  @IsUUID()
  leadId?: string;
}
