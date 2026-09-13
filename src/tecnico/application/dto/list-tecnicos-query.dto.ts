import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsEnum, IsOptional, IsString, MaxLength } from 'class-validator';
import { TecnicoStatus } from '../../../../generated/prisma/enums.js';
import { PaginationQueryDto } from '../../../common/dto/pagination.dto.js';

/**
 * Ver o comentário em cliente/application/dto/list-clientes-query.dto.ts: os
 * filtros de listagem precisam viver no mesmo DTO que page/limit, senão o
 * ValidationPipe global (forbidNonWhitelisted) rejeita a query inteira com 400.
 */
export class ListTecnicosQueryDto extends PaginationQueryDto {
  @ApiPropertyOptional({ enum: TecnicoStatus })
  @IsOptional()
  @IsEnum(TecnicoStatus)
  status?: TecnicoStatus;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(120)
  especialidade?: string;
}
