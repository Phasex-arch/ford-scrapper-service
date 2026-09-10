import { ApiPropertyOptional } from '@nestjs/swagger';
import { Transform } from 'class-transformer';
import {
  IsBoolean,
  IsEnum,
  IsOptional,
  IsString,
  MaxLength,
} from 'class-validator';
import { Role } from '../../../../generated/prisma/enums.js';
import { PaginationQueryDto } from '../../../common/dto/pagination.dto.js';

/**
 * Filtros de GET /colaboradores.
 *
 * P1-2: o ValidationPipe global usa `forbidNonWhitelisted`, e um `@Query()` sem
 * chave valida o objeto de query INTEIRO contra o DTO. Com a paginacao sozinha
 * ali, `?ativo=true` e `?role=ADMIN` — ambos documentados em @ApiQuery —
 * devolviam 400. Os filtros tem de morar no mesmo DTO da paginacao.
 */
export class ListColaboradorQueryDto extends PaginationQueryDto {
  @ApiPropertyOptional({
    type: Boolean,
    description: 'Por padrao a listagem traz apenas ativos (A7)',
  })
  @IsOptional()
  // Le o valor cru de `obj`, nao o de `value`: com `enableImplicitConversion` a
  // query string ja chega convertida por `Boolean('false')` — que e `true`.
  @Transform(({ obj }) => {
    const bruto = (obj as Record<string, unknown>).ativo;
    if (bruto === undefined) return undefined;
    return bruto === true || bruto === 'true' || bruto === '1';
  })
  @IsBoolean()
  ativo?: boolean;

  @ApiPropertyOptional({ enum: Role })
  @IsOptional()
  @IsEnum(Role)
  role?: Role;

  @ApiPropertyOptional({ description: 'Busca por nome, email ou registro' })
  @IsOptional()
  @IsString()
  @MaxLength(120)
  search?: string;
}
