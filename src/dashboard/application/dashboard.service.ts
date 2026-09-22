import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../../prisma/prisma.service.js';

export type DashPeriod = 'hoje' | 'semana' | 'mes' | 'trimestre' | 'ano';

const MESES = [
  'Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun',
  'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez',
];
const DIAS_SEMANA = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'];
const SERIES_MESES = 6;
const SERIES_TRIMESTRES = 6;
const ESTOQUE_BAIXO_LIMITE = 3;

export interface ReceitaSnapshot {
  kpis: {
    /** Confirmada + pipeline (financiamentos pendente/em análise) do mês corrente. */
    total: number;
    /** Só o que já fechou: financiamentos aprovados + serviços concluídos. */
    confirmada: number;
    /** Valor médio dos financiamentos aprovados no mês. */
    ticketMedio: number;
    conversao: number;
  };
  /** Únicas duas fontes reais de receita no sistema — nada de categoria inventada. */
  categorias: { financiamentos: number; servicos: number };
  trimestral: { labels: string[]; valores: number[] };
  geradoEm: string;
}

export interface DesempenhoSnapshot {
  kpis: {
    /** % de clientes com status ATIVO sobre o total de clientes cadastrados. */
    retencao: number;
    /** % de ordens de serviço concluídas sobre o total criado no mês. */
    produtividade: number;
  };
  /** Um por colaborador com papel de venda (GERENTE/FUNCIONARIO) — conversão
   * real dos leads atribuídos a ele no mês (responsavelId). Sem atribuição
   * de "responsável" no lead, o colaborador aparece com 0%, não some da
   * lista — é dado real de que ninguém foi atribuído a ele ainda. */
  /** convertidos = contagem bruta por trás do %, usada só pro hover do
   * gráfico de barras — o % sozinho não diz se foi 1 de 1 ou 10 de 10. */
  consultores: { nome: string; conversao: number; convertidos: number }[];
  /** Últimos N meses: % de clientes criados naquele mês que seguem ATIVO hoje. */
  retencaoMensal: { labels: string[]; valores: number[] };
  geradoEm: string;
}

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
    /** Meta de receita mensal cadastrada em Metas — linha de referência tracejada. */
    target: number[];
    conversion: number[];
    /** Contagem bruta de leads convertidos por mês (mesmo índice de `conversion`)
     * — usada só pro tooltip do gráfico de barras; a % sozinha não diz se foi
     * "1 de 1" ou "10 de 10". */
    conversionCount: number[];
    /** Só presente quando periodo='ano' — receita dos mesmos 12 meses um
     * ano antes, pra comparação direta na linha do gráfico. */
    revenuePrevYear?: number[];
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
      this.buildPeriodSeries(periodo),
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

  /**
   * Snapshot financeiro pra tela de Receita — mês corrente. Reaproveita a
   * mesma definição de receita do dashboard (financiamento aprovado +
   * serviço concluído), mas separa em "confirmada" (já fechou) vs "total"
   * (confirmada + pipeline ainda em aberto), e expõe a única quebra por
   * categoria que tem fonte real: financiamentos vs serviços.
   */
  async receita(): Promise<ReceitaSnapshot> {
    const intervalo = this.computeInterval('mes');
    const where = { createdAt: { gte: intervalo.inicio, lt: intervalo.fim } };

    const [financiamentos, ordensConcluidas, leadsTotal, leadsConvertidos, trimestral] =
      await Promise.all([
        this.prisma.financiamento.findMany({ where, select: { valor: true, status: true } }),
        this.prisma.ordemServico.findMany({
          where: { ...where, status: 'CONCLUIDO' },
          select: { valor: true },
        }),
        this.prisma.lead.count({ where }),
        this.prisma.lead.count({ where: { ...where, convertido: true } }),
        this.buildQuarterlySeries(SERIES_TRIMESTRES),
      ]);

    const aprovados = financiamentos.filter((f) => f.status === 'APROVADO');
    const pipeline = financiamentos.filter(
      (f) => f.status === 'PENDENTE' || f.status === 'ANALISE',
    );
    const receitaFinanciamentos = aprovados.reduce((acc, f) => acc + f.valor, 0);
    const receitaServicos = ordensConcluidas.reduce((acc, o) => acc + o.valor, 0);
    const receitaPipeline = pipeline.reduce((acc, f) => acc + f.valor, 0);
    const confirmada = receitaFinanciamentos + receitaServicos;

    return {
      kpis: {
        total: Math.round(confirmada + receitaPipeline),
        confirmada: Math.round(confirmada),
        ticketMedio: aprovados.length > 0 ? Math.round(receitaFinanciamentos / aprovados.length) : 0,
        conversao: leadsTotal > 0 ? +((leadsConvertidos / leadsTotal) * 100).toFixed(1) : 0,
      },
      categorias: {
        financiamentos: Math.round(receitaFinanciamentos),
        servicos: Math.round(receitaServicos),
      },
      trimestral,
      geradoEm: new Date().toISOString(),
    };
  }

  /** Últimos N trimestres (civis) de receita real — mesma definição de sempre. */
  private async buildQuarterlySeries(quarters: number) {
    const now = new Date();
    const currentQStartMonth = Math.floor(now.getUTCMonth() / 3) * 3;
    const start = new Date(
      Date.UTC(now.getUTCFullYear(), currentQStartMonth - 3 * (quarters - 1), 1),
    );

    const [financiamentosAprovados, servicosConcluidos] = await Promise.all([
      this.prisma.financiamento.findMany({
        where: { status: 'APROVADO', createdAt: { gte: start } },
        select: { valor: true, createdAt: true },
      }),
      this.prisma.ordemServico.findMany({
        where: { status: 'CONCLUIDO', createdAt: { gte: start } },
        select: { valor: true, createdAt: true },
      }),
    ]);

    const quarterKey = (d: Date) => `${d.getUTCFullYear()}-Q${Math.floor(d.getUTCMonth() / 3) + 1}`;

    const buckets: { key: string; label: string; valor: number }[] = [];
    for (let i = quarters - 1; i >= 0; i--) {
      const d = new Date(Date.UTC(now.getUTCFullYear(), currentQStartMonth - 3 * i, 1));
      buckets.push({ key: quarterKey(d), label: `Q${Math.floor(d.getUTCMonth() / 3) + 1}/${d.getUTCFullYear()}`, valor: 0 });
    }
    const byKey = new Map(buckets.map((b) => [b.key, b]));

    for (const f of financiamentosAprovados) {
      const bucket = byKey.get(quarterKey(f.createdAt));
      if (bucket) bucket.valor += f.valor;
    }
    for (const s of servicosConcluidos) {
      const bucket = byKey.get(quarterKey(s.createdAt));
      if (bucket) bucket.valor += s.valor;
    }

    return {
      labels: buckets.map((b) => b.label),
      valores: buckets.map((b) => Math.round(b.valor)),
    };
  }

  /**
   * Snapshot de performance pra tela de Desempenho. Retenção e produtividade
   * são calculados de dados que já existem (Cliente.status, OrdemServico
   * concluída). Performance por consultor depende de Lead.responsavelId —
   * um colaborador sem nenhum lead atribuído aparece com 0%, honestamente,
   * em vez de sumir da lista.
   */
  async desempenho(): Promise<DesempenhoSnapshot> {
    const intervalo = this.computeInterval('mes');
    const where = { createdAt: { gte: intervalo.inicio, lt: intervalo.fim } };

    const [totalClientes, clientesAtivos, ordensNoMes, ordensConcluidas, consultores, retencaoMensal] =
      await Promise.all([
        this.prisma.cliente.count(),
        this.prisma.cliente.count({ where: { status: 'ATIVO' } }),
        this.prisma.ordemServico.count({ where }),
        this.prisma.ordemServico.count({ where: { ...where, status: 'CONCLUIDO' } }),
        this.buildConsultorPerformance(intervalo),
        this.buildRetencaoMensal(SERIES_MESES),
      ]);

    return {
      kpis: {
        retencao: totalClientes > 0 ? +((clientesAtivos / totalClientes) * 100).toFixed(1) : 0,
        produtividade: ordensNoMes > 0 ? +((ordensConcluidas / ordensNoMes) * 100).toFixed(1) : 0,
      },
      consultores,
      retencaoMensal,
      geradoEm: new Date().toISOString(),
    };
  }

  private async buildConsultorPerformance(intervalo: { inicio: Date; fim: Date }) {
    const colaboradores = await this.prisma.colaborador.findMany({
      where: { role: { in: ['GERENTE', 'FUNCIONARIO'] }, ativo: true },
      select: { id: true, nome: true },
      orderBy: { nome: 'asc' },
    });

    return Promise.all(
      colaboradores.map(async (c) => {
        const where = {
          responsavelId: c.id,
          createdAt: { gte: intervalo.inicio, lt: intervalo.fim },
        };
        const [total, convertidos] = await Promise.all([
          this.prisma.lead.count({ where }),
          this.prisma.lead.count({ where: { ...where, convertido: true } }),
        ]);
        return {
          nome: c.nome,
          conversao: total > 0 ? +((convertidos / total) * 100).toFixed(1) : 0,
          convertidos,
        };
      }),
    );
  }

  private async buildRetencaoMensal(months: number) {
    const now = new Date();
    const start = new Date(
      Date.UTC(now.getUTCFullYear(), now.getUTCMonth() - (months - 1), 1),
    );
    const clientes = await this.prisma.cliente.findMany({
      where: { createdAt: { gte: start } },
      select: { createdAt: true, status: true },
    });

    const buckets: { key: string; label: string; total: number; ativos: number }[] = [];
    for (let i = months - 1; i >= 0; i--) {
      const d = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() - i, 1));
      buckets.push({ key: this.monthKey(d), label: this.monthLabel(d), total: 0, ativos: 0 });
    }
    const byKey = new Map(buckets.map((b) => [b.key, b]));

    for (const c of clientes) {
      const bucket = byKey.get(this.monthKey(c.createdAt));
      if (!bucket) continue;
      bucket.total += 1;
      if (c.status === 'ATIVO') bucket.ativos += 1;
    }

    return {
      labels: buckets.map((b) => b.label),
      valores: buckets.map((b) => (b.total > 0 ? Math.round((b.ativos / b.total) * 100) : 0)),
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
      // Lead.convertido é a fonte real — marcado automaticamente tanto por
      // financiamento aprovado quanto por OS paga concluída (ver
      // FinanciamentoService.aprovar / ServicoService.fecharAgendamentoEConverterLead).
      // Antes só contava financiamento aprovado e ignorava a segunda via.
      this.prisma.lead.count({ where: { ...where, convertido: true } }),
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
   * Janelas de tempo da série do RevenueChart, com granularidade adaptada
   * ao `periodo` selecionado no Dashboard — antes a série era sempre fixa
   * em "últimos 6 meses" (calendário) não importa o que o seletor
   * mostrasse, o que fazia o gráfico parecer travado ao trocar o filtro.
   * Cada período cobre a janela INTEIRA correspondente (não só "até agora")
   * — mesmo padrão do "trimestre", que já mostrava o mês corrente inteiro:
   *   hoje      → 12 blocos de 2h cobrindo o dia inteiro (00h–24h)
   *   semana    → 7 dias (hoje e os 6 anteriores)
   *   mes       → 4 blocos de 7 dias (últimas 4 semanas)
   *   trimestre → 6 meses civis (comportamento original, inalterado)
   */
  private buildPeriodBuckets(periodo: DashPeriod): { label: string; inicio: Date; fim: Date }[] {
    const now = new Date();
    const HOUR = 3_600_000;
    const DAY = 24 * HOUR;

    if (periodo === 'hoje') {
      const dayStart = Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate());
      return Array.from({ length: 12 }, (_, i) => ({
        label: `${String(i * 2).padStart(2, '0')}h`,
        inicio: new Date(dayStart + i * 2 * HOUR),
        fim: new Date(dayStart + (i + 1) * 2 * HOUR),
      }));
    }

    if (periodo === 'semana') {
      const todayStart = Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate());
      const start = todayStart - 6 * DAY;
      return Array.from({ length: 7 }, (_, i) => {
        const inicio = new Date(start + i * DAY);
        return { label: DIAS_SEMANA[inicio.getUTCDay()], inicio, fim: new Date(start + (i + 1) * DAY) };
      });
    }

    if (periodo === 'mes') {
      const todayStart = Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate());
      const start = todayStart - 27 * DAY;
      return Array.from({ length: 4 }, (_, i) => {
        const inicio = new Date(start + i * 7 * DAY);
        return { label: this.shortDate(inicio), inicio, fim: new Date(start + (i + 1) * 7 * DAY) };
      });
    }

    // ano — 12 meses civis (o ano corrente completo, rolando com "hoje" —
    // mesma lógica do trimestre, só com mais meses).
    const meses = periodo === 'ano' ? 12 : SERIES_MESES;
    return Array.from({ length: meses }, (_, idx) => {
      const i = meses - 1 - idx;
      const inicio = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() - i, 1));
      const fim = new Date(Date.UTC(inicio.getUTCFullYear(), inicio.getUTCMonth() + 1, 1));
      return { label: this.monthLabel(inicio), inicio, fim };
    });
  }

  /**
   * Série do RevenueChart (receita + conversão de leads), com bucket por
   * janela de `buildPeriodBuckets` — mesma fonte de receita de sempre
   * (financiamentos aprovados + serviços concluídos) e conversão real
   * (Lead.convertido).
   *
   * `target` é a meta de receita mensal cadastrada em Metas (indicador
   * "receita"), como linha de referência ("é aqui que a receita deveria
   * chegar neste intervalo"). No período trimestre cada bucket já é ~1 mês,
   * então mostra o valor cheio da meta, como sempre foi; nos períodos mais
   * finos (hoje/semana/mes) a meta é PRORATEADA pela duração do bucket
   * (ex.: um bucket de 1 dia mostra meta/dias-do-mês) — sem isso, uma barra
   * de receita de um único dia ficaria minúscula ao lado de uma linha de
   * meta mensal inteira, o que não ajuda a enxergar se o ritmo está bom.
   * Fica em 0 (linha não aparece) se não houver meta de receita cadastrada.
   */
  private async buildPeriodSeries(periodo: DashPeriod) {
    const buckets = this.buildPeriodBuckets(periodo);
    const rangeStart = buckets[0].inicio;
    const rangeEnd = buckets[buckets.length - 1].fim;

    const [financiamentosAprovados, servicosConcluidos, leads, leadsConvertidos, metaReceita] =
      await Promise.all([
        this.prisma.financiamento.findMany({
          where: { status: 'APROVADO', createdAt: { gte: rangeStart, lt: rangeEnd } },
          select: { valor: true, createdAt: true },
        }),
        this.prisma.ordemServico.findMany({
          where: { status: 'CONCLUIDO', createdAt: { gte: rangeStart, lt: rangeEnd } },
          select: { valor: true, createdAt: true },
        }),
        this.prisma.lead.findMany({
          where: { createdAt: { gte: rangeStart, lt: rangeEnd } },
          select: { id: true, createdAt: true },
        }),
        this.prisma.lead.findMany({
          where: { createdAt: { gte: rangeStart, lt: rangeEnd }, convertido: true },
          select: { id: true },
        }),
        this.prisma.meta.findFirst({
          where: { indicador: 'receita' },
          orderBy: { createdAt: 'desc' },
          select: { alvo: true },
        }),
      ]);
    const metaMensal = metaReceita?.alvo ?? 0;
    const convertedIds = new Set(leadsConvertidos.map((l) => l.id));

    const acumulado = buckets.map((b) => ({ ...b, receita: 0, leadsTotal: 0, leadsConvertidos: 0 }));
    const bucketPara = (data: Date) => acumulado.find((b) => data >= b.inicio && data < b.fim);

    for (const f of financiamentosAprovados) {
      const b = bucketPara(f.createdAt);
      if (b) b.receita += f.valor;
    }
    for (const s of servicosConcluidos) {
      const b = bucketPara(s.createdAt);
      if (b) b.receita += s.valor;
    }
    for (const l of leads) {
      const b = bucketPara(l.createdAt);
      if (!b) continue;
      b.leadsTotal += 1;
      if (convertedIds.has(l.id)) b.leadsConvertidos += 1;
    }

    const now = new Date();
    const diasNoMesAtual = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() + 1, 0)).getUTCDate();
    const DAY = 86_400_000;

    // No período "ano" a linha de referência vira "Ano anterior" (comparação
    // real, o que o usuário pediu) no lugar da Meta — 12x a meta mensal
    // repetida não diria nada de novo que a Meta Mensal (tela de Metas) já
    // não mostra, e mostrar as duas juntas (Meta + Ano anterior) ficaria
    // cheio demais pro mesmo gráfico.
    const revenuePrevYear = periodo === 'ano' ? await this.buildRevenuePrevYear(acumulado) : undefined;

    return {
      labels: acumulado.map((b) => b.label),
      revenue: acumulado.map((b) => Math.round(b.receita)),
      target: acumulado.map((b) => {
        if (periodo === 'ano') return 0;
        if (periodo === 'trimestre') return Math.round(metaMensal);
        const bucketDias = (b.fim.getTime() - b.inicio.getTime()) / DAY;
        return Math.round(metaMensal * (bucketDias / diasNoMesAtual));
      }),
      conversion: acumulado.map((b) =>
        b.leadsTotal > 0 ? +((b.leadsConvertidos / b.leadsTotal) * 100).toFixed(1) : 0,
      ),
      conversionCount: acumulado.map((b) => b.leadsConvertidos),
      ...(revenuePrevYear ? { revenuePrevYear } : {}),
    };
  }

  /**
   * Receita (financiamentos aprovados + serviços concluídos) dos MESMOS 12
   * meses de `buckets`, um ano antes — pra sobrepor "Ano anterior" na linha
   * de Receita Mensal quando periodo='ano' (comparação direta mês a mês,
   * não só o delta % agregado do KPI do topo).
   */
  private async buildRevenuePrevYear(
    buckets: { label: string; inicio: Date; fim: Date }[],
  ): Promise<number[]> {
    const prevBuckets = buckets.map((b) => ({
      inicio: new Date(Date.UTC(b.inicio.getUTCFullYear() - 1, b.inicio.getUTCMonth(), 1)),
      fim: new Date(Date.UTC(b.fim.getUTCFullYear() - 1, b.fim.getUTCMonth(), 1)),
    }));
    const rangeStart = prevBuckets[0].inicio;
    const rangeEnd = prevBuckets[prevBuckets.length - 1].fim;

    const [financiamentosAprovados, servicosConcluidos] = await Promise.all([
      this.prisma.financiamento.findMany({
        where: { status: 'APROVADO', createdAt: { gte: rangeStart, lt: rangeEnd } },
        select: { valor: true, createdAt: true },
      }),
      this.prisma.ordemServico.findMany({
        where: { status: 'CONCLUIDO', createdAt: { gte: rangeStart, lt: rangeEnd } },
        select: { valor: true, createdAt: true },
      }),
    ]);

    const receitaPorBucket = prevBuckets.map(() => 0);
    const indiceDoBucket = (data: Date) =>
      prevBuckets.findIndex((b) => data >= b.inicio && data < b.fim);

    for (const f of financiamentosAprovados) {
      const i = indiceDoBucket(f.createdAt);
      if (i >= 0) receitaPorBucket[i] += f.valor;
    }
    for (const s of servicosConcluidos) {
      const i = indiceDoBucket(s.createdAt);
      if (i >= 0) receitaPorBucket[i] += s.valor;
    }
    return receitaPorBucket.map((v) => Math.round(v));
  }

  private shortDate(d: Date): string {
    return `${String(d.getUTCDate()).padStart(2, '0')}/${String(d.getUTCMonth() + 1).padStart(2, '0')}`;
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
      case 'ano':
        inicio.setFullYear(inicio.getFullYear() - 1);
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
