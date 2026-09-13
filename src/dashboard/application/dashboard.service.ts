import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../../prisma/prisma.service.js';

export type DashPeriod = 'hoje' | 'semana' | 'mes' | 'trimestre';

const MESES = [
  'Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun',
  'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez',
];
const SERIES_MESES = 6;
const ESTOQUE_BAIXO_LIMITE = 3;

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
  // Variação de cada indicador contra o período anterior de mesma duração.
  // leads/agendamentos/receita/estoqueNovo/sla: variação percentual.
  // conversao/nota: variação em pontos absolutos (não faz sentido calcular
  // "% de uma %" nesses dois). `null` = sem base de comparação (anterior = 0).
  deltas: {
    leads: number | null;
    agendamentos: number | null;
    receita: number | null;
    conversao: number | null;
    sla: number | null;
    nota: number | null;
    estoque: number | null;
  };
  breakdown: {
    leadsPorUrgencia: Record<string, number>;
    servicosPorStatus: Record<string, number>;
    financiamentosPorStatus: Record<string, number>;
  };
  series: {
    labels: string[];
    revenue: number[];
    conversion: number[];
  };
  alertas: {
    slaRisco: { quantidade: number } | null;
    estoqueBaixo: { modelo: string; versao: string; quantidade: number } | null;
    leadPrioritario: { cliente: string; veiculo: string; valor: number } | null;
    metaAtingida: { titulo: string; atual: number; alvo: number; unidade: string } | null;
  };
  geradoEm: string;
}

interface PeriodAggregates {
  leadsTotal: number;
  leadsConvertidos: number;
  receita: number;
  agendamentos: number;
  nota: number;
  notaAmostras: number;
  estoqueNovo: number;
  slaHoras: number;
  slaAmostras: number;
}

@Injectable()
export class DashboardService {
  constructor(private readonly prisma: PrismaService) {}

  async snapshot(periodo: DashPeriod = 'mes'): Promise<DashboardSnapshot> {
    const intervalo = this.computeInterval(periodo);
    const anterior = this.computePreviousInterval(intervalo);

    const [
      atual,
      passado,
      estoqueAgg,
      leadsPorUrgencia,
      servicosPorStatus,
      financiamentosPorStatus,
      series,
      alertas,
    ] = await Promise.all([
      this.computePeriodAggregates(intervalo.inicio, intervalo.fim),
      this.computePeriodAggregates(anterior.inicio, anterior.fim),
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
      this.buildMonthlySeries(SERIES_MESES),
      this.buildAlertas(),
    ]);

    const conversaoAtual = this.pctConversao(atual);
    const conversaoAnterior = this.pctConversao(passado);
    const estoque = estoqueAgg._sum.quantidade ?? 0;

    return {
      periodo,
      intervalo: {
        inicio: intervalo.inicio.toISOString(),
        fim: intervalo.fim.toISOString(),
      },
      kpis: {
        leads: atual.leadsTotal,
        agendamentos: atual.agendamentos,
        receita: atual.receita,
        conversao: conversaoAtual,
        sla: +atual.slaHoras.toFixed(1),
        nota: +atual.nota.toFixed(1),
        estoque,
      },
      deltas: {
        leads: this.pctDelta(atual.leadsTotal, passado.leadsTotal),
        agendamentos: this.pctDelta(atual.agendamentos, passado.agendamentos),
        receita: this.pctDelta(atual.receita, passado.receita),
        // Sem leads em algum dos dois períodos não há taxa real pra comparar.
        conversao: this.amostraDelta(
          conversaoAtual, atual.leadsTotal, conversaoAnterior, passado.leadsTotal, 'pontos',
        ),
        // Sem ordem concluída em algum dos dois períodos não há SLA real pra comparar.
        sla: this.amostraDelta(
          atual.slaHoras, atual.slaAmostras, passado.slaHoras, passado.slaAmostras, 'pct',
        ),
        // Sem avaliação em algum dos dois períodos não há nota real pra comparar.
        nota: this.amostraDelta(
          atual.nota, atual.notaAmostras, passado.nota, passado.notaAmostras, 'pontos',
        ),
        // "estoque" é uma foto do total atual (sem histórico de níveis), então
        // o delta compara quantas unidades novas entraram no estoque no
        // período vs. no período anterior — a única variação real disponível.
        estoque: this.pctDelta(atual.estoqueNovo, passado.estoqueNovo),
      },
      breakdown: {
        leadsPorUrgencia: this.toRecord(leadsPorUrgencia, 'urgencia'),
        servicosPorStatus: this.toRecord(servicosPorStatus, 'status'),
        financiamentosPorStatus: this.toRecord(financiamentosPorStatus, 'status'),
      },
      series,
      alertas,
      geradoEm: new Date().toISOString(),
    };
  }

  private async computePeriodAggregates(inicio: Date, fim: Date): Promise<PeriodAggregates> {
    const where = { createdAt: { gte: inicio, lt: fim } };
    const [
      leadsTotal,
      leadsConvertidos,
      ordens,
      financiamentos,
      avaliacaoAgg,
      estoqueNovo,
      ordensConcluidas,
    ] = await Promise.all([
      this.prisma.lead.count({ where }),
      // "Convertido" = o lead tem ao menos um financiamento aprovado vinculado
      // (Financiamento.leadId), independente de quando o financiamento fechou.
      this.prisma.lead.count({
        where: { ...where, financiamentos: { some: { status: 'APROVADO' } } },
      }),
      this.prisma.ordemServico.findMany({ where, select: { valor: true, status: true } }),
      this.prisma.financiamento.findMany({ where, select: { valor: true, status: true } }),
      this.prisma.avaliacao.aggregate({ _avg: { nota: true }, _count: { nota: true }, where }),
      this.prisma.estoqueVeiculo.count({ where }),
      this.prisma.ordemServico.findMany({
        where: { ...where, status: 'CONCLUIDO' },
        select: { createdAt: true, updatedAt: true },
      }),
    ]);

    // Receita = financiamentos efetivamente aprovados + serviços efetivamente
    // concluídos no período — antes somava todo Financiamento (inclusive
    // reprovado/pendente), o que não é receita de verdade.
    const receitaFinanciamentos = financiamentos
      .filter((f) => f.status === 'APROVADO')
      .reduce((acc, f) => acc + f.valor, 0);
    const receitaServicos = ordens
      .filter((o) => o.status === 'CONCLUIDO')
      .reduce((acc, o) => acc + o.valor, 0);

    // SLA médio = tempo entre abertura e conclusão das ordens concluídas no
    // período, em horas. É uma aproximação (updatedAt muda em qualquer edição,
    // não só na conclusão), mas é o único sinal real disponível no schema —
    // antes era um valor fixo (2.3) sem nenhuma fonte de dados.
    const slaHoras =
      ordensConcluidas.length > 0
        ? ordensConcluidas.reduce(
            (acc, o) => acc + (o.updatedAt.getTime() - o.createdAt.getTime()) / 3_600_000,
            0,
          ) / ordensConcluidas.length
        : 0;

    return {
      leadsTotal,
      leadsConvertidos,
      receita: receitaFinanciamentos + receitaServicos,
      agendamentos: ordens.length,
      nota: avaliacaoAgg._avg.nota ?? 0,
      notaAmostras: avaliacaoAgg._count.nota,
      estoqueNovo,
      slaHoras,
      slaAmostras: ordensConcluidas.length,
    };
  }

  private pctConversao(a: PeriodAggregates): number {
    return a.leadsTotal > 0 ? +((a.leadsConvertidos / a.leadsTotal) * 100).toFixed(1) : 0;
  }

  /** Variação percentual entre dois valores; null quando não há base de comparação. */
  private pctDelta(atual: number, anterior: number): number | null {
    if (anterior === 0) return atual === 0 ? 0 : null;
    return +(((atual - anterior) / anterior) * 100).toFixed(1);
  }

  /** Variação em pontos absolutos — usado para métricas que já são um índice/percentual. */
  private pontosDelta(atual: number, anterior: number): number | null {
    return +(atual - anterior).toFixed(1);
  }

  /**
   * Delta "por amostra" (nota e SLA médio): esses valores são médias — um
   * lado sem nenhuma amostra no período não vira "0" real, é "sem dado", e
   * comparar contra ele produziria uma variação inventada (ex: nota saindo
   * de 0 pra 4.8 só porque não houve avaliação no período anterior).
   */
  private amostraDelta(
    atual: number,
    atualAmostras: number,
    anterior: number,
    anteriorAmostras: number,
    modo: 'pontos' | 'pct',
  ): number | null {
    if (atualAmostras === 0 || anteriorAmostras === 0) return null;
    return modo === 'pontos' ? this.pontosDelta(atual, anterior) : this.pctDelta(atual, anterior);
  }

  /**
   * Alertas operacionais reais, calculados a partir do estado atual (não
   * filtrados por período — são avisos de "agora", não métricas históricas).
   * Cada campo vem `null` quando não há nada a alertar, em vez de forçar um
   * card com conteúdo inventado.
   */
  private async buildAlertas() {
    const [ordensRisco, itemBaixoEstoque, leadUrgente, metas] = await Promise.all([
      this.prisma.ordemServico.count({
        where: {
          status: { in: ['PREVISTO', 'ANDAMENTO'] },
          prioridade: { in: ['RISCO', 'ATRASADO'] },
        },
      }),
      this.prisma.estoqueVeiculo.findFirst({
        where: { quantidade: { lte: ESTOQUE_BAIXO_LIMITE } },
        orderBy: { quantidade: 'asc' },
        select: { modelo: true, versao: true, quantidade: true },
      }),
      this.prisma.lead.findFirst({
        where: { urgencia: 'URGENTE' },
        orderBy: { valorEstimado: 'desc' },
        select: { clienteNome: true, veiculoInteresse: true, valorEstimado: true },
      }),
      this.prisma.meta.findMany({
        select: { titulo: true, atual: true, alvo: true, unidade: true, lowerIsBetter: true },
      }),
    ]);

    const metaAtingida = metas.find((m) =>
      m.lowerIsBetter ? m.atual <= m.alvo : m.atual >= m.alvo,
    );

    return {
      slaRisco: ordensRisco > 0 ? { quantidade: ordensRisco } : null,
      estoqueBaixo: itemBaixoEstoque
        ? {
            modelo: itemBaixoEstoque.modelo,
            versao: itemBaixoEstoque.versao,
            quantidade: itemBaixoEstoque.quantidade,
          }
        : null,
      leadPrioritario: leadUrgente
        ? {
            cliente: leadUrgente.clienteNome,
            veiculo: leadUrgente.veiculoInteresse,
            valor: leadUrgente.valorEstimado,
          }
        : null,
      metaAtingida: metaAtingida
        ? {
            titulo: metaAtingida.titulo,
            atual: metaAtingida.atual,
            alvo: metaAtingida.alvo,
            unidade: metaAtingida.unidade,
          }
        : null,
    };
  }

  /**
   * Série dos últimos N meses (calendário, mês corrente incluso) de receita
   * (financiamentos aprovados + serviços concluídos) e conversão de leads,
   * pro RevenueChart do dashboard. Independente do `periodo` selecionado —
   * é sempre "os últimos N meses fechados por mês civil".
   */
  private async buildMonthlySeries(months: number) {
    const now = new Date();
    const start = new Date(
      Date.UTC(now.getUTCFullYear(), now.getUTCMonth() - (months - 1), 1),
    );

    const [financiamentosAprovados, servicosConcluidos, leads, leadsConvertidos] =
      await Promise.all([
        this.prisma.financiamento.findMany({
          where: { status: 'APROVADO', createdAt: { gte: start } },
          select: { valor: true, createdAt: true },
        }),
        this.prisma.ordemServico.findMany({
          where: { status: 'CONCLUIDO', createdAt: { gte: start } },
          select: { valor: true, createdAt: true },
        }),
        this.prisma.lead.findMany({
          where: { createdAt: { gte: start } },
          select: { id: true, createdAt: true },
        }),
        this.prisma.lead.findMany({
          where: {
            createdAt: { gte: start },
            financiamentos: { some: { status: 'APROVADO' } },
          },
          select: { id: true },
        }),
      ]);

    const convertedIds = new Set(leadsConvertidos.map((l) => l.id));

    const buckets: {
      key: string;
      label: string;
      receita: number;
      leadsTotal: number;
      leadsConvertidos: number;
    }[] = [];
    for (let i = months - 1; i >= 0; i--) {
      const d = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() - i, 1));
      buckets.push({
        key: this.monthKey(d),
        label: this.monthLabel(d),
        receita: 0,
        leadsTotal: 0,
        leadsConvertidos: 0,
      });
    }
    const byKey = new Map(buckets.map((b) => [b.key, b]));

    for (const f of financiamentosAprovados) {
      const bucket = byKey.get(this.monthKey(f.createdAt));
      if (bucket) bucket.receita += f.valor;
    }
    for (const s of servicosConcluidos) {
      const bucket = byKey.get(this.monthKey(s.createdAt));
      if (bucket) bucket.receita += s.valor;
    }
    for (const l of leads) {
      const bucket = byKey.get(this.monthKey(l.createdAt));
      if (!bucket) continue;
      bucket.leadsTotal += 1;
      if (convertedIds.has(l.id)) bucket.leadsConvertidos += 1;
    }

    return {
      labels: buckets.map((b) => b.label),
      revenue: buckets.map((b) => Math.round(b.receita)),
      conversion: buckets.map((b) =>
        b.leadsTotal > 0 ? +((b.leadsConvertidos / b.leadsTotal) * 100).toFixed(1) : 0,
      ),
    };
  }

  private monthKey(date: Date): string {
    return `${date.getUTCFullYear()}-${String(date.getUTCMonth() + 1).padStart(2, '0')}`;
  }

  private monthLabel(date: Date): string {
    return `${MESES[date.getUTCMonth()]}/${String(date.getUTCFullYear()).slice(2)}`;
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

  /** Janela imediatamente anterior, com a mesma duração do período atual. */
  private computePreviousInterval(intervalo: { inicio: Date; fim: Date }) {
    const duracaoMs = intervalo.fim.getTime() - intervalo.inicio.getTime();
    return {
      inicio: new Date(intervalo.inicio.getTime() - duracaoMs),
      fim: intervalo.inicio,
    };
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
