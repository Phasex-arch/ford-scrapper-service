import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../../prisma/prisma.service.js';
import type { LeadUrgencia } from '../../../generated/prisma/enums.js';
import type { CreateLeadDto } from '../application/dto/create-lead.dto.js';
import type { UpdateLeadDto } from '../application/dto/update-lead.dto.js';

export interface LeadListFilter {
  page: number;
  limit: number;
  urgencia?: LeadUrgencia;
  search?: string;
  convertido?: boolean;
}

@Injectable()
export class LeadRepository {
  constructor(private readonly prisma: PrismaService) {}

  /** responsavel vem sempre incluído (só o nome) — é o que faz "Assumir
   * lead" ter efeito visível de verdade na tela, em vez de só gravar um
   * responsavelId que ninguém consegue ver. */
  private readonly includeResponsavel = {
    responsavel: { select: { nome: true } },
  } as const;

  findAll(filter: LeadListFilter) {
    const where = this.buildWhere(filter);
    return this.prisma.lead.findMany({
      where,
      orderBy: [{ urgencia: 'asc' }, { createdAt: 'desc' }],
      skip: (filter.page - 1) * filter.limit,
      take: filter.limit,
      include: this.includeResponsavel,
    });
  }

  count(filter: LeadListFilter) {
    return this.prisma.lead.count({ where: this.buildWhere(filter) });
  }

  findById(id: string) {
    return this.prisma.lead.findUnique({ where: { id }, include: this.includeResponsavel });
  }

  findByCodigo(codigo: string) {
    return this.prisma.lead.findUnique({ where: { codigo } });
  }

  create(dto: CreateLeadDto) {
    return this.prisma.lead.create({ data: dto, include: this.includeResponsavel });
  }

  update(id: string, dto: UpdateLeadDto) {
    return this.prisma.lead.update({ where: { id }, data: dto, include: this.includeResponsavel });
  }

  delete(id: string) {
    return this.prisma.lead.delete({ where: { id } });
  }

  private buildWhere(filter: LeadListFilter) {
    const where: Record<string, unknown> = {};
    if (filter.urgencia) where.urgencia = filter.urgencia;
    if (filter.convertido !== undefined) where.convertido = filter.convertido;
    if (filter.search && filter.search.trim()) {
      const q = filter.search.trim();
      where.OR = [
        { clienteNome: { contains: q, mode: 'insensitive' } },
        { veiculoInteresse: { contains: q, mode: 'insensitive' } },
        { codigo: { contains: q, mode: 'insensitive' } },
      ];
    }
    return where;
  }
}
