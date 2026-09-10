import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsDateString,
  IsEmail,
  IsEnum,
  IsOptional,
  IsString,
  MaxLength,
  MinLength,
} from 'class-validator';
import { ClienteStatus } from '../../../../generated/prisma/enums.js';

export class CreateClienteDto {
  @ApiPropertyOptional({
    example: 'C001',
    description: 'Opcional: o servidor gera a sequencia quando ausente.',
  })
  @IsOptional()
  @IsString()
  @MinLength(2)
  @MaxLength(20)
  codigo?: string;

  @ApiProperty({ example: 'Carlos Eduardo Mendes' })
  @IsString()
  @MinLength(3)
  @MaxLength(120)
  nome!: string;

  @ApiProperty({ example: '(11) 98245-1122' })
  @IsString()
  @MinLength(8)
  @MaxLength(20)
  telefone!: string;

  @ApiProperty({ example: 'carlos.mendes@gmail.com' })
  @IsEmail()
  @MaxLength(120)
  email!: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsDateString()
  ultimaVisita?: string;

  @ApiPropertyOptional({ enum: ClienteStatus, default: ClienteStatus.ATIVO })
  @IsOptional()
  @IsEnum(ClienteStatus)
  status?: ClienteStatus;

  // `veiculosCount` e `ltv` sao metricas derivadas: nascem em 0 e sao corrigidas
  // por PATCH (ADMIN/GERENTE, auditado). Aceitar na criacao permitiria ao cliente
  // declarar o proprio LTV.

  @ApiProperty({ example: 'CM', maxLength: 4 })
  @IsString()
  @MinLength(1)
  @MaxLength(4)
  iniciais!: string;

  @ApiProperty({ example: 'Premium' })
  @IsString()
  @MaxLength(40)
  segmento!: string;
}
