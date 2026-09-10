import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../../prisma/prisma.service.js';
import type { CreateMetaDto } from '../application/dto/create-meta.dto.js';
import type { UpdateMetaDto } from '../application/dto/update-meta.dto.js';

export interface MetaListFilter {
  page: number;
  limit: number;
  periodo?: string;
  indicador?: string;
}

@Injectable()
export class MetaRepository {
  constructor(private readonly prisma: PrismaService) {}

  findAll(filter: MetaListFilter) {
    const where = this.buildWhere(filter);
    return this.prisma.meta.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      skip: (filter.page - 1) * filter.limit,
      take: filter.limit,
    });
  }

  count(filter: MetaListFilter) {
    return this.prisma.meta.count({ where: this.buildWhere(filter) });
  }

  findById(id: string) {
    return this.prisma.meta.findUnique({ where: { id } });
  }

  findByCodigo(codigo: string) {
    return this.prisma.meta.findUnique({ where: { codigo } });
  }

  /** Total de registros — base da sequencia de `codigo` gerada no servidor. */
  totalRegistros() {
    return this.prisma.meta.count();
  }

  create(dto: CreateMetaDto & { codigo: string; atual: number }) {
    return this.prisma.meta.create({ data: dto });
  }

  update(id: string, dto: UpdateMetaDto) {
    return this.prisma.meta.update({ where: { id }, data: dto });
  }

  delete(id: string) {
    return this.prisma.meta.delete({ where: { id } });
  }

  private buildWhere(filter: MetaListFilter) {
    const where: Record<string, unknown> = {};
    if (filter.periodo) where.periodo = filter.periodo;
    if (filter.indicador) where.indicador = filter.indicador;
    return where;
  }
}
