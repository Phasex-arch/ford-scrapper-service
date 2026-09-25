import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  IsInt,
  IsOptional,
  IsString,
  Matches,
  Max,
  MaxLength,
  Min,
  MinLength,
} from 'class-validator';

export class SearchQueryDto {
  @ApiProperty({ example: 'ranger', description: 'Termo de busca (modelo, versão ou categoria)' })
  @IsString()
  @MinLength(1)
  @MaxLength(60)
  @Matches(/^[\p{L}\p{N}\s\-./]+$/u, {
    message: 'q contém caracteres inválidos',
  })
  q!: string;

  @ApiPropertyOptional({ description: 'Página (a partir de 1)' })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(10_000)
  page?: number;

  @ApiPropertyOptional({ description: 'Itens por página (1-100)' })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(100)
  limit?: number;
}
