import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsEnum, IsOptional, IsString, MaxLength } from 'class-validator';
import { LeadUrgencia } from '../../../../generated/prisma/enums.js';
import { PaginationQueryDto } from '../../../common/dto/pagination.dto.js';

/**
 * Filtros de GET /leads.
 *
 * P1-2: o ValidationPipe global usa `forbidNonWhitelisted`, e um `@Query()` sem
 * chave valida o objeto de query INTEIRO contra o DTO. Com a paginacao sozinha
 * ali, `?urgencia=MEDIA` e `?search=...` — ambos documentados em @ApiQuery —
 * devolviam 400. Os filtros tem de morar no mesmo DTO da paginacao.
 */
export class ListLeadQueryDto extends PaginationQueryDto {
  @ApiPropertyOptional({ enum: LeadUrgencia })
  @IsOptional()
  @IsEnum(LeadUrgencia)
  urgencia?: LeadUrgencia;

  @ApiPropertyOptional({ description: 'Busca por nome, veiculo ou codigo' })
  @IsOptional()
  @IsString()
  @MaxLength(120)
  search?: string;
}
