import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsEnum, IsOptional, IsString, MaxLength } from 'class-validator';
import { TecnicoStatus } from '../../../../generated/prisma/enums.js';

export class UpdateTecnicoDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(120)
  nome?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(4)
  iniciais?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(120)
  especialidade?: string;

  @ApiPropertyOptional({ enum: TecnicoStatus })
  @IsOptional()
  @IsEnum(TecnicoStatus)
  status?: TecnicoStatus;
}
