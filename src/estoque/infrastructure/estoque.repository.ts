import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../../prisma/prisma.service.js';
import type {
  CondicaoVeiculo,
  SegmentoVeiculo,
} from '../../../generated/prisma/enums.js';
import type { CreateEstoqueDto } from '../application/dto/create-estoque.dto.js';
import type { UpdateEstoqueDto } from '../application/dto/update-estoque.dto.js';

export interface EstoqueListFilter {
  page: number;
  limit: number;
  condicao?: CondicaoVeiculo;
  segmento?: SegmentoVeiculo;
  modelo?: string;
  search?: string;
  precoMin?: number;
  precoMax?: number;
  status?: string;
}

@Injectable()
export class EstoqueRepository {
  constructor(private readonly prisma: PrismaService) {}

  findAll(filter: EstoqueListFilter) {
    const where = this.buildWhere(filter);
    return this.prisma.estoqueVeiculo.findMany({
      where,
      orderBy: { modelo: 'asc' },
      skip: (filter.page - 1) * filter.limit,
      take: filter.limit,
    });
  }

  count(filter: EstoqueListFilter) {
    return this.prisma.estoqueVeiculo.count({ where: this.buildWhere(filter) });
  }

  findById(id: string) {
    return this.prisma.estoqueVeiculo.findUnique({ where: { id } });
  }

  findByCodigo(codigo: string) {
    return this.prisma.estoqueVeiculo.findUnique({ where: { codigo } });
  }

  create(dto: CreateEstoqueDto) {
    return this.prisma.estoqueVeiculo.create({
      data: { ...dto, opcionais: dto.opcionais ?? [] },
    });
  }

  update(id: string, dto: UpdateEstoqueDto) {
    return this.prisma.estoqueVeiculo.update({ where: { id }, data: dto });
  }

  delete(id: string) {
    return this.prisma.estoqueVeiculo.delete({ where: { id } });
  }

  private buildWhere(filter: EstoqueListFilter) {
    const where: Record<string, unknown> = {};
    if (filter.condicao) where.condicao = filter.condicao;
    if (filter.segmento) where.segmento = filter.segmento;
    if (filter.status) where.status = filter.status;
    if (filter.modelo) {
      where.modelo = { contains: filter.modelo, mode: 'insensitive' };
    }
    if (filter.search && filter.search.trim()) {
      const q = filter.search.trim();
      where.OR = [
        { modelo: { contains: q, mode: 'insensitive' } },
        { versao: { contains: q, mode: 'insensitive' } },
        { cor: { contains: q, mode: 'insensitive' } },
        { codigo: { contains: q, mode: 'insensitive' } },
      ];
    }
    if (filter.precoMin !== undefined || filter.precoMax !== undefined) {
      const preco: Record<string, number> = {};
      if (filter.precoMin !== undefined) preco.gte = filter.precoMin;
      if (filter.precoMax !== undefined) preco.lte = filter.precoMax;
      where.preco = preco;
    }
    return where;
  }
}
