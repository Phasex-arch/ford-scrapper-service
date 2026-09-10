import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../../prisma/prisma.service.js';

export type DashPeriod = 'hoje' | 'semana' | 'mes' | 'trimestre';

export interface DashboardSnapshot {
  periodo: DashPeriod;
  intervalo: { inicio: string; fim: string };
  kpis: {
    leads: number;
    agendamentos: number;
    receita: number;
    conversao: number;
    sla: number;
    nota: number;
    estoque: number;
  };
  breakdown: {
    leadsPorUrgencia: Record<string, number>;
    servicosPorStatus: Record<string, number>;
    financiamentosPorStatus: Record<string, number>;
  };
  geradoEm: string;
}

@Injectable()
export class DashboardService {
  constructor(private readonly prisma: PrismaService) {}

  async snapshot(periodo: DashPeriod = 'mes'): Promise<DashboardSnapshot> {
    const intervalo = this.computeInterval(periodo);

    const [
      leads,
      ordens,
      financiamentos,
      avaliacaoAgg,
      estoqueAgg,
      leadsPorUrgencia,
      servicosPorStatus,
      financiamentosPorStatus,
    ] = await Promise.all([
      this.prisma.lead.count({
        where: { createdAt: { gte: intervalo.inicio, lt: intervalo.fim } },
      }),
      this.prisma.ordemServico.findMany({
        where: { createdAt: { gte: intervalo.inicio, lt: intervalo.fim } },
        select: {
          valor: true,
          status: true,
          createdAt: true,
          updatedAt: true,
        },
      }),
      this.prisma.financiamento.findMany({
        where: { createdAt: { gte: intervalo.inicio, lt: intervalo.fim } },
        select: { valor: true, status: true },
      }),
      this.prisma.avaliacao.aggregate({ _avg: { nota: true } }),
      this.prisma.estoqueVeiculo.aggregate({ _sum: { quantidade: true } }),
      this.prisma.lead.groupBy({
        by: ['urgencia'],
        _count: { id: true },
        where: { createdAt: { gte: intervalo.inicio, lt: intervalo.fim } },
      }),
      this.prisma.ordemServico.groupBy({
        by: ['status'],
        _count: { id: true },
        where: { createdAt: { gte: intervalo.inicio, lt: intervalo.fim } },
      }),
      this.prisma.financiamento.groupBy({
        by: ['status'],
        _count: { id: true },
        where: { createdAt: { gte: intervalo.inicio, lt: intervalo.fim } },
      }),
    ]);

    // `agendamentos` sao as OS ainda agendadas (PREVISTO), nao o total de ordens
    // do periodo: contar tudo inflava o numero e, por tabela, a conversao.
    //
    // ponytail: nao existe entidade Agendamento no schema (a agenda e so tela);
    // OS em PREVISTO e o proxy mais proximo. Quando houver agendamento de fato,
    // trocar a fonte aqui.
    const agendamentos = ordens.filter((o) => o.status === 'PREVISTO').length;

    // Receita = contratos de financiamento do periodo. As OS ficam de fora porque
    // OrdemServico.valor e String no schema ("R$ 3.800"): nao e somavel nem
    // auditavel. Corrigir exige migration (Decimal/Int em centavos).
    const receita = financiamentos.reduce((acc, f) => acc + (f.valor ?? 0), 0);

    const conversao = leads > 0 ? +((agendamentos / leads) * 100).toFixed(1) : 0;
    const nota = +(avaliacaoAgg._avg.nota ?? 0).toFixed(1);
    const estoque = estoqueAgg._sum.quantidade ?? 0;
    const sla = this.slaMedioHoras(ordens);

    return {
      periodo,
      intervalo: {
        inicio: intervalo.inicio.toISOString(),
        fim: intervalo.fim.toISOString(),
      },
      kpis: {
        leads,
        agendamentos,
        receita,
        conversao,
        sla,
        nota,
        estoque,
      },
      breakdown: {
        leadsPorUrgencia: this.toRecord(leadsPorUrgencia, 'urgencia'),
        servicosPorStatus: this.toRecord(servicosPorStatus, 'status'),
        financiamentosPorStatus: this.toRecord(financiamentosPorStatus, 'status'),
      },
      geradoEm: new Date().toISOString(),
    };
  }

  /**
   * SLA medio em horas: tempo de abertura ate a conclusao das OS concluidas no
   * periodo. Sem OS concluida, 0 — a tela mostra "0.0h" em vez de um numero
   * inventado (antes era a constante 2.3, que nunca refletiu dado nenhum).
   *
   * ponytail: o schema nao tem `concluidoEm`, entao o fim e `updatedAt` (ultimo
   * toque na OS). Para SLA contratual, adicionar a coluna e usar ela aqui.
   */
  private slaMedioHoras(
    ordens: Array<{ status: string; createdAt: Date; updatedAt: Date }>,
  ): number {
    const concluidas = ordens.filter((o) => o.status === 'CONCLUIDO');
    if (concluidas.length === 0) return 0;
    const horas = concluidas.reduce(
      (acc, o) =>
        acc + (o.updatedAt.getTime() - o.createdAt.getTime()) / 3_600_000,
      0,
    );
    return +(horas / concluidas.length).toFixed(1);
  }

  private computeInterval(periodo: DashPeriod) {
    const fim = new Date();
    const inicio = new Date();
    switch (periodo) {
      case 'hoje':
        inicio.setHours(0, 0, 0, 0);
        break;
      case 'semana':
        inicio.setDate(inicio.getDate() - 7);
        break;
      case 'mes':
        inicio.setMonth(inicio.getMonth() - 1);
        break;
      case 'trimestre':
        inicio.setMonth(inicio.getMonth() - 3);
        break;
    }
    return { inicio, fim };
  }

  private toRecord(
    rows: Array<Record<string, unknown> & { _count: { id: number } }>,
    key: string,
  ): Record<string, number> {
    const out: Record<string, number> = {};
    for (const row of rows) {
      const k = String(row[key]);
      out[k] = row._count.id;
    }
    return out;
  }
}
