import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../../prisma/prisma.service.js';
import type { AvaliacaoStatus } from '../../../generated/prisma/enums.js';
import type { CreateAvaliacaoDto } from '../application/dto/create-avaliacao.dto.js';
import type { UpdateAvaliacaoDto } from '../application/dto/update-avaliacao.dto.js';

export interface AvaliacaoListFilter {
  page: number;
  limit: number;
  notaMin?: number;
  notaMax?: number;
  /** Ausente = sem filtro de status (uso interno/moderação). */
  status?: AvaliacaoStatus;
}

@Injectable()
export class AvaliacaoRepository {
  constructor(private readonly prisma: PrismaService) {}

  findAll(filter: AvaliacaoListFilter) {
    const where = this.buildWhere(filter);
    return this.prisma.avaliacao.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      skip: (filter.page - 1) * filter.limit,
      take: filter.limit,
    });
  }

  count(filter: AvaliacaoListFilter) {
    return this.prisma.avaliacao.count({ where: this.buildWhere(filter) });
  }

  findById(id: string) {
    return this.prisma.avaliacao.findUnique({ where: { id } });
  }

  create(dto: CreateAvaliacaoDto) {
    return this.prisma.avaliacao.create({ data: { ...dto, status: 'PENDENTE' } });
  }

  update(id: string, dto: UpdateAvaliacaoDto) {
    return this.prisma.avaliacao.update({ where: { id }, data: dto });
  }

  delete(id: string) {
    return this.prisma.avaliacao.delete({ where: { id } });
  }

  /** Só conta avaliações aprovadas — é a nota que o público de fato vê. */
  async stats() {
    const [count, avg] = await Promise.all([
      this.prisma.avaliacao.count({ where: { status: 'APROVADA' } }),
      this.prisma.avaliacao.aggregate({ where: { status: 'APROVADA' }, _avg: { nota: true } }),
    ]);
    return { total: count, notaMedia: avg._avg.nota ?? 0 };
  }

  private buildWhere(filter: AvaliacaoListFilter) {
    const where: Record<string, unknown> = {};
    if (filter.status) where.status = filter.status;
    if (filter.notaMin !== undefined || filter.notaMax !== undefined) {
      const nota: Record<string, number> = {};
      if (filter.notaMin !== undefined) nota.gte = filter.notaMin;
      if (filter.notaMax !== undefined) nota.lte = filter.notaMax;
      where.nota = nota;
    }
    return where;
  }
}
