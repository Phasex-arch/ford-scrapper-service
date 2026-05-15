import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../../prisma/prisma.service.js';
import type {
  OrdemServicoPrioridade,
  OrdemServicoStatus,
} from '../../../generated/prisma/enums.js';
import type { CreateServicoDto } from '../application/dto/create-servico.dto.js';
import type { UpdateServicoDto } from '../application/dto/update-servico.dto.js';

export interface ServicoListFilter {
  page: number;
  limit: number;
  status?: OrdemServicoStatus;
  prioridade?: OrdemServicoPrioridade;
  tecnico?: string;
  search?: string;
}

@Injectable()
export class ServicoRepository {
  constructor(private readonly prisma: PrismaService) {}

  findAll(filter: ServicoListFilter) {
    const where = this.buildWhere(filter);
    return this.prisma.ordemServico.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      skip: (filter.page - 1) * filter.limit,
      take: filter.limit,
    });
  }

  count(filter: ServicoListFilter) {
    return this.prisma.ordemServico.count({ where: this.buildWhere(filter) });
  }

  findById(id: string) {
    return this.prisma.ordemServico.findUnique({ where: { id } });
  }

  findByNumero(numero: string) {
    return this.prisma.ordemServico.findUnique({ where: { numero } });
  }

  create(dto: CreateServicoDto) {
    return this.prisma.ordemServico.create({ data: dto });
  }

  update(id: string, dto: UpdateServicoDto) {
    return this.prisma.ordemServico.update({ where: { id }, data: dto });
  }

  delete(id: string) {
    return this.prisma.ordemServico.delete({ where: { id } });
  }

  private buildWhere(filter: ServicoListFilter) {
    const where: Record<string, unknown> = {};
    if (filter.status) where.status = filter.status;
    if (filter.prioridade) where.prioridade = filter.prioridade;
    if (filter.tecnico) {
      where.tecnico = { contains: filter.tecnico, mode: 'insensitive' };
    }
    if (filter.search && filter.search.trim()) {
      const q = filter.search.trim();
      where.OR = [
        { cliente: { contains: q, mode: 'insensitive' } },
        { veiculo: { contains: q, mode: 'insensitive' } },
        { tipo: { contains: q, mode: 'insensitive' } },
        { numero: { contains: q, mode: 'insensitive' } },
      ];
    }
    return where;
  }
}
