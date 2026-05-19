import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../../prisma/prisma.service.js';
import type { TecnicoStatus } from '../../../generated/prisma/enums.js';
import type { CreateTecnicoDto } from '../application/dto/create-tecnico.dto.js';
import type { UpdateTecnicoDto } from '../application/dto/update-tecnico.dto.js';

export interface TecnicoListFilter {
  page: number;
  limit: number;
  status?: TecnicoStatus;
  especialidade?: string;
}

@Injectable()
export class TecnicoRepository {
  constructor(private readonly prisma: PrismaService) {}

  findAll(filter: TecnicoListFilter) {
    const where = this.buildWhere(filter);
    return this.prisma.tecnico.findMany({
      where,
      orderBy: { nome: 'asc' },
      skip: (filter.page - 1) * filter.limit,
      take: filter.limit,
    });
  }

  count(filter: TecnicoListFilter) {
    return this.prisma.tecnico.count({ where: this.buildWhere(filter) });
  }

  findById(id: string) {
    return this.prisma.tecnico.findUnique({ where: { id } });
  }

  create(dto: CreateTecnicoDto) {
    return this.prisma.tecnico.create({ data: dto });
  }

  update(id: string, dto: UpdateTecnicoDto) {
    return this.prisma.tecnico.update({ where: { id }, data: dto });
  }

  delete(id: string) {
    return this.prisma.tecnico.delete({ where: { id } });
  }

  private buildWhere(filter: TecnicoListFilter) {
    const where: Record<string, unknown> = {};
    if (filter.status) where.status = filter.status;
    if (filter.especialidade) {
      where.especialidade = {
        contains: filter.especialidade,
        mode: 'insensitive',
      };
    }
    return where;
  }
}
