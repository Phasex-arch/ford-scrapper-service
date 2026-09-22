import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../../../prisma/prisma.service.js';
import {
  AgendamentoListFilter,
  AgendamentoRepository,
} from '../infrastructure/agendamento.repository.js';
import type { CreateAgendamentoDto } from './dto/create-agendamento.dto.js';
import type { UpdateAgendamentoDto } from './dto/update-agendamento.dto.js';

@Injectable()
export class AgendamentoService {
  constructor(
    private readonly repo: AgendamentoRepository,
    private readonly prisma: PrismaService,
  ) {}

  async list(opts: AgendamentoListFilter) {
    const [data, total] = await Promise.all([
      this.repo.findAll(opts),
      this.repo.count(opts),
    ]);
    return { data, total };
  }

  async findById(id: string) {
    const a = await this.repo.findById(id);
    if (!a) throw new NotFoundException('Agendamento nao encontrado');
    return a;
  }

  /**
   * Quando clienteId/tecnicoId vêm preenchidos, o nome de exibição (cliente/
   * tecnico) é resolvido a partir do cadastro real, não do texto digitado —
   * a FK é a fonte da verdade, o texto é só cache de leitura (ver seção 4
   * da auditoria). Sem clienteId, exige `cliente` em texto (cliente avulso).
   */
  async create(dto: CreateAgendamentoDto) {
    if (!dto.clienteId && !dto.cliente) {
      throw new BadRequestException('Informe cliente ou clienteId');
    }
    const clienteNome = dto.clienteId
      ? await this.resolverNomeCliente(dto.clienteId)
      : dto.cliente!;
    const tecnicoNome = dto.tecnicoId
      ? await this.resolverNomeTecnico(dto.tecnicoId)
      : dto.tecnico;

    return this.repo.create({ ...dto, cliente: clienteNome, tecnico: tecnicoNome });
  }

  async update(id: string, dto: UpdateAgendamentoDto) {
    await this.findById(id);
    const cliente = dto.clienteId ? await this.resolverNomeCliente(dto.clienteId) : dto.cliente;
    const tecnico = dto.tecnicoId ? await this.resolverNomeTecnico(dto.tecnicoId) : dto.tecnico;
    return this.repo.update(id, { ...dto, cliente, tecnico });
  }

  async delete(id: string) {
    await this.findById(id);
    return this.repo.delete(id);
  }

  private async resolverNomeCliente(clienteId: string): Promise<string> {
    const cliente = await this.prisma.cliente.findUnique({ where: { id: clienteId } });
    if (!cliente) throw new NotFoundException('Cliente nao encontrado');
    return cliente.nome;
  }

  private async resolverNomeTecnico(tecnicoId: string): Promise<string> {
    const tecnico = await this.prisma.tecnico.findUnique({ where: { id: tecnicoId } });
    if (!tecnico) throw new NotFoundException('Tecnico nao encontrado');
    return tecnico.nome;
  }
}
