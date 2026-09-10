import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsEnum, IsOptional, IsString, MaxLength } from 'class-validator';
import { FinanciamentoStatus } from '../../../../generated/prisma/enums.js';
import { PaginationQueryDto } from '../../../common/dto/pagination.dto.js';

/** Filtros de GET /financiamentos — ver ListClienteQueryDto. */
export class ListFinanciamentoQueryDto extends PaginationQueryDto {
  @ApiPropertyOptional({ enum: FinanciamentoStatus })
  @IsOptional()
  @IsEnum(FinanciamentoStatus)
  status?: FinanciamentoStatus;

  @ApiPropertyOptional({ description: 'Busca por cliente, veiculo ou codigo' })
  @IsOptional()
  @IsString()
  @MaxLength(120)
  search?: string;
}
