import {
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../../../prisma/prisma.service.js';
import {
  LeadListFilter,
  LeadRepository,
} from '../infrastructure/lead.repository.js';
import type { CreateLeadDto } from './dto/create-lead.dto.js';
import type { UpdateLeadDto } from './dto/update-lead.dto.js';

@Injectable()
export class LeadService {
  constructor(
    private readonly repo: LeadRepository,
    private readonly prisma: PrismaService,
  ) {}

  async list(opts: LeadListFilter) {
    const [data, total] = await Promise.all([
      this.repo.findAll(opts),
      this.repo.count(opts),
    ]);
    return { data, total };
  }

  async findById(id: string) {
    const lead = await this.repo.findById(id);
    if (!lead) throw new NotFoundException('Lead nao encontrado');
    return lead;
  }

  async create(dto: CreateLeadDto) {
    const existing = await this.repo.findByCodigo(dto.codigo);
    if (existing) throw new ConflictException('Codigo ja cadastrado');
    return this.repo.create(dto);
  }

  /** Quando estoqueVeiculoId vem preenchido, o texto de exibição
   * (veiculoInteresse) é resolvido a partir do item real do estoque — não
   * fica mais só no que foi digitado no formulário público (ver seção 4
   * da auditoria: mesmo padrão já aplicado em Agendamento/OrdemServico). */
  async update(id: string, dto: UpdateLeadDto) {
    await this.findById(id);
    const veiculoInteresse = dto.estoqueVeiculoId
      ? await this.resolverVeiculoEstoque(dto.estoqueVeiculoId)
      : dto.veiculoInteresse;
    return this.repo.update(id, { ...dto, veiculoInteresse });
  }

  private async resolverVeiculoEstoque(estoqueVeiculoId: string): Promise<string> {
    const item = await this.prisma.estoqueVeiculo.findUnique({ where: { id: estoqueVeiculoId } });
    if (!item) throw new NotFoundException('Item de estoque nao encontrado');
    return `${item.modelo} ${item.versao}`;
  }

  async delete(id: string) {
    await this.findById(id);
    return this.repo.delete(id);
  }

  /** Registra um contato real (ex.: "Ligar agora") — usado pelo job de
   * reavaliação de urgência pra não escalar por negligência quem acabou de
   * ser contatado. */
  async registrarContato(id: string) {
    await this.findById(id);
    return this.prisma.lead.update({
      where: { id },
      data: { ultimoContatoEm: new Date() },
      include: { responsavel: { select: { nome: true } } },
    });
  }
}
