import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../../prisma/prisma.service.js';
import type { FinanciamentoStatus } from '../../../generated/prisma/enums.js';
import type { CreateFinanciamentoDto } from '../application/dto/create-financiamento.dto.js';
import type { UpdateFinanciamentoDto } from '../application/dto/update-financiamento.dto.js';

export interface FinanciamentoListFilter {
  page: number;
  limit: number;
  status?: FinanciamentoStatus;
  search?: string;
}

@Injectable()
export class FinanciamentoRepository {
  constructor(private readonly prisma: PrismaService) {}

  findAll(filter: FinanciamentoListFilter) {
    const where = this.buildWhere(filter);
    return this.prisma.financiamento.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      skip: (filter.page - 1) * filter.limit,
      take: filter.limit,
    });
  }

  count(filter: FinanciamentoListFilter) {
    return this.prisma.financiamento.count({ where: this.buildWhere(filter) });
  }

  findById(id: string) {
    return this.prisma.financiamento.findUnique({ where: { id } });
  }

  findByCodigo(codigo: string) {
    return this.prisma.financiamento.findUnique({ where: { codigo } });
  }

  create(dto: CreateFinanciamentoDto) {
    return this.prisma.financiamento.create({ data: dto });
  }

  update(id: string, dto: UpdateFinanciamentoDto) {
    return this.prisma.financiamento.update({ where: { id }, data: dto });
  }

  delete(id: string) {
    return this.prisma.financiamento.delete({ where: { id } });
  }

  private buildWhere(filter: FinanciamentoListFilter) {
    const where: Record<string, unknown> = {};
    if (filter.status) where.status = filter.status;
    if (filter.search && filter.search.trim()) {
      const q = filter.search.trim();
      where.OR = [
        { clienteNome: { contains: q, mode: 'insensitive' } },
        { veiculo: { contains: q, mode: 'insensitive' } },
        { codigo: { contains: q, mode: 'insensitive' } },
      ];
    }
    return where;
  }
}
