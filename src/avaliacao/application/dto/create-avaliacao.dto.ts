import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  IsInt,
  IsOptional,
  IsString,
  Max,
  MaxLength,
  Min,
  MinLength,
} from 'class-validator';

export class CreateAvaliacaoDto {
  @ApiProperty({ example: 'Carlos Eduardo Mendes' })
  @IsString()
  @MinLength(3)
  @MaxLength(120)
  cliente!: string;

  @ApiProperty({ minimum: 1, maximum: 5, example: 5 })
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(5)
  nota!: number;

  @ApiProperty({ example: '15/04/2026' })
  @IsString()
  @MaxLength(20)
  data!: string;

  @ApiProperty({ example: 'Excelente atendimento!' })
  @IsString()
  @MinLength(5)
  @MaxLength(2000)
  texto!: string;

  @ApiPropertyOptional({
    example: 'Servico: Revisao 10.000 km - Veiculo: Bronco Sport 2024',
  })
  @IsOptional()
  @IsString()
  @MaxLength(500)
  detalhe?: string;
}
