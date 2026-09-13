import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsEnum, IsOptional, IsString, MaxLength } from 'class-validator';
import { ClienteStatus } from '../../../../generated/prisma/enums.js';
import { PaginationQueryDto } from '../../../common/dto/pagination.dto.js';

/**
 * `@Query() pagination: PaginationQueryDto` sozinho não pode conviver com
 * `@Query('status')`/`@Query('search')` separados na mesma rota: o ValidationPipe
 * global (`whitelist` + `forbidNonWhitelisted`) valida o objeto de query inteiro
 * contra o DTO amarrado ao primeiro `@Query()`, então qualquer campo fora do DTO
 * — mesmo consumido por outro parâmetro do mesmo handler — vira 400. Por isso os
 * filtros de listagem entram aqui, no mesmo DTO que já carrega page/limit.
 */
export class ListClientesQueryDto extends PaginationQueryDto {
  @ApiPropertyOptional({ enum: ClienteStatus })
  @IsOptional()
  @IsEnum(ClienteStatus)
  status?: ClienteStatus;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(40)
  segmento?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(120)
  search?: string;
}
