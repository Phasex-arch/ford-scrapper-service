import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, IsString, MaxLength, MinLength } from 'class-validator';

export class UpdateConcessionariaDto {
  @ApiPropertyOptional({ example: 'Ford SP Centro' })
  @IsOptional()
  @IsString()
  @MinLength(2)
  @MaxLength(200)
  nome?: string;

  @ApiPropertyOptional({ example: '12.345.678/0001-99' })
  @IsOptional()
  @IsString()
  @MaxLength(20)
  cnpj?: string;

  @ApiPropertyOptional({ example: 'Av. Paulista, 1000 — São Paulo/SP' })
  @IsOptional()
  @IsString()
  @MaxLength(300)
  endereco?: string;

  @ApiPropertyOptional({ example: '(11) 3000-4000' })
  @IsOptional()
  @IsString()
  @MaxLength(20)
  telefone?: string;
}
