import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../../prisma/prisma.service.js';
import type { AgendamentoStatus } from '../../../generated/prisma/enums.js';
import type { CreateAgendamentoDto } from '../application/dto/create-agendamento.dto.js';
import type { UpdateAgendamentoDto } from '../application/dto/update-agendamento.dto.js';

export interface AgendamentoListFilter {
  page: number;
  limit: number;
  /** Filtra por um dia específico (YYYY-MM-DD), em UTC. */
  data?: string;
  status?: AgendamentoStatus;
  leadId?: string;
}

@Injectable()
export class AgendamentoRepository {
  constructor(private readonly prisma: PrismaService) {}

  findAll(filter: AgendamentoListFilter) {
    const where = this.buildWhere(filter);
    return this.prisma.agendamento.findMany({
      where,
      orderBy: { dataHora: 'asc' },
      skip: (filter.page - 1) * filter.limit,
      take: filter.limit,
    });
  }

  count(filter: AgendamentoListFilter) {
    return this.prisma.agendamento.count({ where: this.buildWhere(filter) });
  }

  findById(id: string) {
    return this.prisma.agendamento.findUnique({ where: { id } });
  }

  create(dto: CreateAgendamentoDto) {
    return this.prisma.agendamento.create({
      data: { ...dto, dataHora: new Date(dto.dataHora) },
    });
  }

  update(id: string, dto: UpdateAgendamentoDto) {
    return this.prisma.agendamento.update({
      where: { id },
      data: {
        ...dto,
        dataHora: dto.dataHora ? new Date(dto.dataHora) : undefined,
      },
    });
  }

  delete(id: string) {
    return this.prisma.agendamento.delete({ where: { id } });
  }

  private buildWhere(filter: AgendamentoListFilter) {
    const where: Record<string, unknown> = {};
    if (filter.status) where.status = filter.status;
    if (filter.leadId) where.leadId = filter.leadId;
    if (filter.data) {
      const inicio = new Date(`${filter.data}T00:00:00.000Z`);
      const fim = new Date(inicio.getTime() + 24 * 60 * 60 * 1000);
      where.dataHora = { gte: inicio, lt: fim };
    }
    return where;
  }
}
