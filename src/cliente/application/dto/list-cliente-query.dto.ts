import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsEnum, IsOptional, IsString, MaxLength } from 'class-validator';
import { ClienteStatus } from '../../../../generated/prisma/enums.js';
import { PaginationQueryDto } from '../../../common/dto/pagination.dto.js';

/**
 * Filtros de GET /clientes.
 *
 * Precisam estar declarados no mesmo DTO da paginação: o ValidationPipe global
 * usa `forbidNonWhitelisted`, então um `@Query()` sem chave valida o objeto de
 * query inteiro — qualquer filtro fora deste DTO devolveria 400.
 */
export class ListClienteQueryDto extends PaginationQueryDto {
  @ApiPropertyOptional({ enum: ClienteStatus })
  @IsOptional()
  @IsEnum(ClienteStatus)
  status?: ClienteStatus;

  @ApiPropertyOptional({ example: 'Premium' })
  @IsOptional()
  @IsString()
  @MaxLength(40)
  segmento?: string;

  @ApiPropertyOptional({ description: 'Busca por nome, email ou codigo' })
  @IsOptional()
  @IsString()
  @MaxLength(120)
  search?: string;
}
