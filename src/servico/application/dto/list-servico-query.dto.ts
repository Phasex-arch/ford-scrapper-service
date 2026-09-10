import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsEnum, IsOptional, IsString, MaxLength } from 'class-validator';
import {
  OrdemServicoPrioridade,
  OrdemServicoStatus,
} from '../../../../generated/prisma/enums.js';
import { PaginationQueryDto } from '../../../common/dto/pagination.dto.js';

/** Filtros de GET /servicos — ver ListClienteQueryDto. */
export class ListServicoQueryDto extends PaginationQueryDto {
  @ApiPropertyOptional({ enum: OrdemServicoStatus })
  @IsOptional()
  @IsEnum(OrdemServicoStatus)
  status?: OrdemServicoStatus;

  @ApiPropertyOptional({ enum: OrdemServicoPrioridade })
  @IsOptional()
  @IsEnum(OrdemServicoPrioridade)
  prioridade?: OrdemServicoPrioridade;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(120)
  tecnico?: string;

  @ApiPropertyOptional({ description: 'Busca por cliente, veiculo, tipo ou numero' })
  @IsOptional()
  @IsString()
  @MaxLength(120)
  search?: string;
}
