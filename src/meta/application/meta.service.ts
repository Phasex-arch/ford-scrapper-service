import {
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import {
  MetaListFilter,
  MetaRepository,
} from '../infrastructure/meta.repository.js';
import { PrismaService } from '../../../prisma/prisma.service.js';
import type { CreateMetaDto } from './dto/create-meta.dto.js';
import type { UpdateMetaDto } from './dto/update-meta.dto.js';

const MESES_PT: Record<string, number> = {
  janeiro: 0, fevereiro: 1, marco: 2, abril: 3, maio: 4, junho: 5,
  julho: 6, agosto: 7, setembro: 8, outubro: 9, novembro: 10, dezembro: 11,
};

/**
 * Indicadores com fonte real computável a partir de outras tabelas — "atual"
 * é substituído pelo valor calculado ao vivo em toda leitura, mesmo que
 * tenha sido definido manualmente na criação/edição. "nps" fica de fora
 * porque não existe cálculo real de NPS a partir da nota 1–5 de Avaliacao —
 * só pode ser reportado manualmente.
 */
const INDICADORES_COMPUTAVEIS = new Set(['leads', 'receita', 'conv', 'sla', 'vendas']);

interface MetaLike {
  indicador: string;
  periodo: string;
  atual: number;
  responsavelId?: string | null;
}

@Injectable()
export class MetaService {
  constructor(
    private readonly repo: MetaRepository,
    private readonly prisma: PrismaService,
  ) {}

  async list(opts: MetaListFilter) {
    const [rows, total] = await Promise.all([
      this.repo.findAll(opts),
      this.repo.count(opts),
    ]);
    const data = await Promise.all(rows.map((m) => this.comAtualReal(m)));
    return { data, total };
  }

  async findById(id: string) {
    const meta = await this.repo.findById(id);
    if (!meta) throw new NotFoundException('Meta nao encontrada');
    return this.comAtualReal(meta);
  }

  async create(dto: CreateMetaDto) {
    const existing = await this.repo.findByCodigo(dto.codigo);
    if (existing) throw new ConflictException('Codigo de meta ja cadastrado');
    const created = await this.repo.create(dto);
    return this.comAtualReal(created);
  }

  async update(id: string, dto: UpdateMetaDto) {
    await this.findById(id);
    const updated = await this.repo.update(id, dto);
    return this.comAtualReal(updated);
  }

  async delete(id: string) {
    await this.findById(id);
    return this.repo.delete(id);
  }

  /**
   * Para indicadores computáveis com período reconhecível, troca "atual"
   * pelo valor real calculado na hora. Se o indicador não é computável ou o
   * período não pôde ser interpretado, devolve a meta como veio do banco —
   * nunca falha a requisição por causa disso.
   */
  private async comAtualReal<T extends MetaLike>(meta: T): Promise<T> {
    if (!INDICADORES_COMPUTAVEIS.has(meta.indicador)) return meta;
    const range = this.parsePeriodo(meta.periodo);
    if (!range) return meta;
    const atual = await this.computeAtual(meta.indicador, range, meta.responsavelId ?? null);
    if (atual === null) return meta;
    return { ...meta, atual };
  }

  /** Aceita "2026-09" (input type=month) e "Abril/2026" (dado histórico). */
  private parsePeriodo(periodo: string): { inicio: Date; fim: Date } | null {
    const iso = /^(\d{4})-(\d{2})$/.exec(periodo);
    if (iso) {
      const ano = Number(iso[1]);
      const mes = Number(iso[2]) - 1;
      return { inicio: new Date(Date.UTC(ano, mes, 1)), fim: new Date(Date.UTC(ano, mes + 1, 1)) };
    }
    const nomeado = /^([A-Za-zÀ-ÿ]+)\/(\d{4})$/.exec(periodo);
    if (nomeado) {
      const nome = nomeado[1]
        .toLowerCase()
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '');
      const mes = MESES_PT[nome];
      if (mes === undefined) return null;
      const ano = Number(nomeado[2]);
      return { inicio: new Date(Date.UTC(ano, mes, 1)), fim: new Date(Date.UTC(ano, mes + 1, 1)) };
    }
    return null;
  }

  private async computeAtual(
    indicador: string,
    range: { inicio: Date; fim: Date },
    responsavelId: string | null,
  ): Promise<number | null> {
    const where = { createdAt: { gte: range.inicio, lt: range.fim } };
    // Meta sem responsável = loja/equipe inteira (comportamento original).
    // Com responsável, filtra pelos dados atribuídos aquela pessoa mesma —
    // Lead e Financiamento já têm responsavelId real no schema.
    const porResponsavel = responsavelId ? { responsavelId } : {};

    switch (indicador) {
      case 'leads':
        return this.prisma.lead.count({ where: { ...where, ...porResponsavel } });

      case 'vendas':
        // Proxy: financiamento aprovado no periodo, mesmo sinal usado pela
        // "conversao" do dashboard — nao ha registro direto de "venda".
        return this.prisma.financiamento.count({
          where: { ...where, status: 'APROVADO', ...porResponsavel },
        });

      case 'receita': {
        const financiamentos = await this.prisma.financiamento.findMany({
          where: { ...where, status: 'APROVADO', ...porResponsavel },
          select: { valor: true },
        });
        // Receita de ordem de serviço não é atribuível a um consultor de
        // vendas (OrdemServico.tecnico é texto livre, sem relacao real com
        // Colaborador) — meta de loja inteira soma os dois; meta de pessoa
        // conta só o que é dela de verdade (financiamento).
        const ordens = responsavelId
          ? []
          : await this.prisma.ordemServico.findMany({
              where: { ...where, status: 'CONCLUIDO' },
              select: { valor: true },
            });
        const total =
          financiamentos.reduce((acc, f) => acc + f.valor, 0) +
          ordens.reduce((acc, o) => acc + o.valor, 0);
        return Math.round(total);
      }

      case 'conv': {
        const [total, convertidos] = await Promise.all([
          this.prisma.lead.count({ where: { ...where, ...porResponsavel } }),
          this.prisma.lead.count({
            where: { ...where, ...porResponsavel, financiamentos: { some: { status: 'APROVADO' } } },
          }),
        ]);
        return total > 0 ? +((convertidos / total) * 100).toFixed(1) : 0;
      }

      case 'sla': {
        // Sem relação real entre OrdemServico e Colaborador (tecnico é texto
        // livre) — SLA sempre reflete a loja inteira, mesmo com responsável
        // definido na meta.
        const ordens = await this.prisma.ordemServico.findMany({
          where: { ...where, status: 'CONCLUIDO' },
          select: { createdAt: true, updatedAt: true },
        });
        if (ordens.length === 0) return 0;
        const horas =
          ordens.reduce(
            (acc, o) => acc + (o.updatedAt.getTime() - o.createdAt.getTime()) / 3_600_000,
            0,
          ) / ordens.length;
        return +horas.toFixed(1);
      }

      default:
        return null;
    }
  }
}
