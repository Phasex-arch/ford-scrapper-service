import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  IsDateString,
  IsEmail,
  IsEnum,
  IsInt,
  IsNumber,
  IsOptional,
  IsString,
  Matches,
  MaxLength,
  Min,
  MinLength,
} from 'class-validator';
import { ClienteStatus } from '../../../../generated/prisma/enums.js';

export class CreateClienteDto {
  @ApiProperty({ example: 'C001' })
  @IsString()
  @MinLength(2)
  @MaxLength(20)
  codigo!: string;

  @ApiProperty({ example: 'Carlos Eduardo Mendes' })
  @IsString()
  @MinLength(3)
  @MaxLength(120)
  nome!: string;

  @ApiProperty({ example: '(11) 98245-1122' })
  @IsString()
  @Matches(/^\(\d{2}\) \d{4,5}-\d{4}$/, {
    message: 'telefone deve estar no formato (XX) XXXXX-XXXX',
  })
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

  @ApiPropertyOptional({ default: 0 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  veiculosCount?: number;

  @ApiPropertyOptional({ default: 0 })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  ltv?: number;

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
