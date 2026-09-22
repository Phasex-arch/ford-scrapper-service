import {
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../../../prisma/prisma.service.js';
import {
  FinanciamentoListFilter,
  FinanciamentoRepository,
} from '../infrastructure/financiamento.repository.js';
import type { CreateFinanciamentoDto } from './dto/create-financiamento.dto.js';
import type { UpdateFinanciamentoDto } from './dto/update-financiamento.dto.js';
import { resolverOuCriarClienteDeLead } from '../../lead/application/lead-conversion.util.js';

function gerarCodigoVeiculoCliente(): string {
  return `VC-${Date.now().toString(36).toUpperCase()}`;
}

@Injectable()
export class FinanciamentoService {
  constructor(
    private readonly repo: FinanciamentoRepository,
    private readonly prisma: PrismaService,
  ) {}

  async list(opts: FinanciamentoListFilter) {
    const [data, total] = await Promise.all([
      this.repo.findAll(opts),
      this.repo.count(opts),
    ]);
    return { data, total };
  }

  async findById(id: string) {
    const item = await this.repo.findById(id);
    if (!item) throw new NotFoundException('Financiamento nao encontrado');
    return item;
  }

  async create(dto: CreateFinanciamentoDto) {
    const existing = await this.repo.findByCodigo(dto.codigo);
    if (existing) throw new ConflictException('Codigo ja cadastrado');
    return this.repo.create(dto);
  }

  /**
   * update() genérico continua existindo pra edição de campos comuns
   * (valor, entrada, prazo...). Uma mudança de `status` pra APROVADO passa
   * pelo fluxo automático abaixo — nunca só grava a coluna.
   */
  async update(id: string, dto: UpdateFinanciamentoDto) {
    const atual = await this.findById(id);
    if (dto.status === 'APROVADO' && atual.status !== 'APROVADO') {
      return this.aprovar(id);
    }
    return this.repo.update(id, dto);
  }

  async delete(id: string) {
    await this.findById(id);
    return this.repo.delete(id);
  }

  /**
   * Regra automática de CRM/DMS disparada pela aprovação — nunca por um
   * clique manual separado (ver seção 0 da auditoria):
   *   1. Financiamento vinculado a um Lead → resolve/cria o Cliente real
   *      (por email ou telefone, evitando duplicata) e marca o Lead como
   *      convertido.
   *   2. Financiamento vinculado a um item real de estoque
   *      (estoqueVeiculoId) → gera o VeiculoCliente (posse) e decrementa
   *      EstoqueVeiculo.quantidade, virando "Vendido" ao chegar a zero.
   * Sem leadId (financiamento avulso, sem lead de origem) só o status muda —
   * não há como resolver um Cliente real com segurança a partir de um nome
   * digitado à mão.
   */
  private async aprovar(id: string) {
    return this.prisma.$transaction(async (tx) => {
      const financiamento = await tx.financiamento.findUniqueOrThrow({ where: { id } });
      const atualizado = await tx.financiamento.update({
        where: { id },
        data: { status: 'APROVADO' },
      });

      if (!financiamento.leadId) return atualizado;

      const lead = await tx.lead.findUnique({ where: { id: financiamento.leadId } });
      if (!lead) return atualizado;

      const clienteId = await resolverOuCriarClienteDeLead(tx, lead);

      if (financiamento.estoqueVeiculoId) {
        const estoque = await tx.estoqueVeiculo.findUnique({
          where: { id: financiamento.estoqueVeiculoId },
        });
        if (estoque && estoque.quantidade > 0) {
          await tx.veiculoCliente.create({
            data: {
              codigo: gerarCodigoVeiculoCliente(),
              clienteId,
              estoqueVeiculoId: estoque.id,
              modelo: estoque.modelo,
              versao: estoque.versao,
              ano: estoque.ano,
              cor: estoque.cor,
              km: estoque.km,
              imagem: estoque.imagem,
              precoAquisicao: financiamento.valor,
              dataAquisicao: new Date(),
              status: 'ATIVO',
            },
          });
          const novaQuantidade = estoque.quantidade - 1;
          await tx.estoqueVeiculo.update({
            where: { id: estoque.id },
            data: {
              quantidade: novaQuantidade,
              status: novaQuantidade === 0 ? 'Vendido' : estoque.status,
            },
          });
          await tx.cliente.update({
            where: { id: clienteId },
            data: {
              veiculosCount: { increment: 1 },
              ltv: { increment: financiamento.valor },
              status: 'ATIVO',
              ultimaVisita: new Date(),
            },
          });
        }
      }

      return atualizado;
    });
  }
}
