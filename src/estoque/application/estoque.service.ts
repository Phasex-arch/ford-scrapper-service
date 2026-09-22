import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../../../prisma/prisma.service.js';
import {
  EstoqueListFilter,
  EstoqueRepository,
} from '../infrastructure/estoque.repository.js';
import type { CreateEstoqueDto } from './dto/create-estoque.dto.js';
import type { UpdateEstoqueDto } from './dto/update-estoque.dto.js';

/** Prazo de validade de uma reserva real — expira sozinha (ver
 * LifecycleJobsService.liberarReservasExpiradas), não fica travada pra sempre. */
export const HORAS_RESERVA_ESTOQUE = 48;

@Injectable()
export class EstoqueService {
  constructor(
    private readonly repo: EstoqueRepository,
    private readonly prisma: PrismaService,
  ) {}

  async list(opts: EstoqueListFilter) {
    const [data, total] = await Promise.all([
      this.repo.findAll(opts),
      this.repo.count(opts),
    ]);
    return { data, total };
  }

  async findById(id: string) {
    const item = await this.repo.findById(id);
    if (!item) throw new NotFoundException('Item de estoque nao encontrado');
    return item;
  }

  async create(dto: CreateEstoqueDto) {
    const existing = await this.repo.findByCodigo(dto.codigo);
    if (existing) throw new ConflictException('Codigo ja cadastrado');
    return this.repo.create(dto);
  }

  async update(id: string, dto: UpdateEstoqueDto) {
    await this.findById(id);
    return this.repo.update(id, dto);
  }

  async delete(id: string) {
    await this.findById(id);
    return this.repo.delete(id);
  }

  /**
   * Reserva real (seção 3 da auditoria — antes era um botão decorativo que
   * só mostrava um toast): vínculo com um Cliente real de verdade e prazo
   * de validade. Sem estoque disponível ou já reservado por outra pessoa,
   * recusa — não sobrescreve uma reserva alheia.
   */
  async reservar(id: string, clienteId: string) {
    const item = await this.findById(id);
    if (item.reservadoClienteId && item.reservadoClienteId !== clienteId) {
      throw new ConflictException('Unidade ja reservada por outro cliente');
    }
    if (item.quantidade <= 0) {
      throw new BadRequestException('Sem unidade disponivel pra reservar');
    }
    const cliente = await this.prisma.cliente.findUnique({ where: { id: clienteId } });
    if (!cliente) throw new NotFoundException('Cliente nao encontrado');

    const reservadoAte = new Date(Date.now() + HORAS_RESERVA_ESTOQUE * 60 * 60 * 1000);
    return this.prisma.estoqueVeiculo.update({
      where: { id },
      data: { status: 'Reservado', reservadoClienteId: clienteId, reservadoAte },
    });
  }

  /** Cancelamento manual de uma reserva em andamento — sem esperar expirar. */
  async liberarReserva(id: string) {
    await this.findById(id);
    return this.prisma.estoqueVeiculo.update({
      where: { id },
      data: { status: 'Disponivel', reservadoClienteId: null, reservadoAte: null },
    });
  }
}
