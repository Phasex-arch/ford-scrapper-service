import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsEnum,
  IsOptional,
  IsString,
  MaxLength,
  MinLength,
} from 'class-validator';
import { TecnicoStatus } from '../../../../generated/prisma/enums.js';

export class CreateTecnicoDto {
  @ApiProperty({ example: 'Andre Souza' })
  @IsString()
  @MinLength(3)
  @MaxLength(120)
  nome!: string;

  @ApiProperty({ example: 'AS' })
  @IsString()
  @MinLength(1)
  @MaxLength(4)
  iniciais!: string;

  @ApiProperty({ example: 'Revisoes programadas' })
  @IsString()
  @MaxLength(120)
  especialidade!: string;

  @ApiPropertyOptional({ enum: TecnicoStatus, default: TecnicoStatus.LIVRE })
  @IsOptional()
  @IsEnum(TecnicoStatus)
  status?: TecnicoStatus;
}
