import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../../../prisma/prisma.service.js';
import {
  ServicoListFilter,
  ServicoRepository,
} from '../infrastructure/servico.repository.js';
import type { CreateServicoDto } from './dto/create-servico.dto.js';
import type { UpdateServicoDto } from './dto/update-servico.dto.js';
import { gerarNumeroOS } from './numero-os.util.js';
import { calcularPrioridade, formatarPrazoExibicao } from './prioridade-os.util.js';
import { resolverOuCriarClienteDeLead } from '../../lead/application/lead-conversion.util.js';

@Injectable()
export class ServicoService {
  constructor(
    private readonly repo: ServicoRepository,
    private readonly prisma: PrismaService,
  ) {}

  async list(opts: ServicoListFilter) {
    const [data, total] = await Promise.all([
      this.repo.findAll(opts),
      this.repo.count(opts),
    ]);
    return { data, total };
  }

  async findById(id: string) {
    const os = await this.repo.findById(id);
    if (!os) throw new NotFoundException('Ordem de servico nao encontrada');
    return os;
  }

  /**
   * clienteId/tecnicoId resolvem o nome de exibição a partir do cadastro
   * real (seção 4 da auditoria) — o texto nunca fica solto quando a FK
   * existe. numero sempre vem do servidor (nunca do cliente). prazo (texto)
   * e prioridade nunca são escolhidos à mão — sempre derivados de
   * prazoData, igual ao job de geração automática a partir de Agendamento.
   */
  async create(dto: CreateServicoDto) {
    if (!dto.clienteId && !dto.cliente) {
      throw new BadRequestException('Informe cliente ou clienteId');
    }
    if (!dto.tecnicoId && !dto.tecnico) {
      throw new BadRequestException('Informe tecnico ou tecnicoId');
    }
    const cliente = dto.clienteId ? await this.resolverNomeCliente(dto.clienteId) : dto.cliente!;
    const tecnico = dto.tecnicoId ? await this.resolverNomeTecnico(dto.tecnicoId) : dto.tecnico!;

    let numero = gerarNumeroOS();
    while (await this.repo.findByNumero(numero)) numero = gerarNumeroOS();

    const prazoData = new Date(dto.prazoData);
    return this.repo.create({
      ...dto,
      numero,
      cliente,
      tecnico,
      prazoData,
      prazo: formatarPrazoExibicao(prazoData),
      prioridade: calcularPrioridade(prazoData),
    });
  }

  /**
   * Fecha o ciclo com Agendamento (seção 0 da auditoria): quando uma OS
   * gerada a partir de um agendamento chega em CONCLUIDO, o agendamento de
   * origem também fecha sozinho — sem isso o agendamento nunca saía do
   * estado AGENDADO exceto por cancelamento manual.
   */
  async update(id: string, dto: UpdateServicoDto) {
    await this.findById(id);
    const cliente = dto.clienteId ? await this.resolverNomeCliente(dto.clienteId) : dto.cliente;
    const tecnico = dto.tecnicoId ? await this.resolverNomeTecnico(dto.tecnicoId) : dto.tecnico;
    const { prazoData: prazoDataStr, ...resto } = dto;
    const prazoData = prazoDataStr ? new Date(prazoDataStr) : undefined;
    const atualizado = await this.repo.update(id, {
      ...resto,
      cliente,
      tecnico,
      ...(prazoData
        ? { prazoData, prazo: formatarPrazoExibicao(prazoData), prioridade: calcularPrioridade(prazoData) }
        : {}),
    });
    if (dto.status === 'CONCLUIDO') {
      await this.fecharAgendamentoEConverterLead(id, atualizado.valor);
    }
    return atualizado;
  }

  /**
   * Segundo evento real de conversão Lead→Cliente, além da aprovação de
   * financiamento (ver FinanciamentoService.aprovar): uma OS PAGA
   * (valor > 0) vinculada a um lead chegando em CONCLUIDO é um compromisso
   * comercial real — fechar uma manutenção de verdade, com dinheiro
   * cobrado. Uma "Visita" auto-gerada do agendamento nasce com valor 0 (ver
   * lifecycle-jobs.service.ts) e nunca converte por aqui — visitar o
   * showroom não é virar cliente.
   */
  private async fecharAgendamentoEConverterLead(osId: string, valor: number): Promise<void> {
    await this.prisma.$transaction(async (tx) => {
      const agendamento = await tx.agendamento.findUnique({ where: { ordemServicoId: osId } });
      if (!agendamento) return;
      if (agendamento.status !== 'CONCLUIDO') {
        await tx.agendamento.update({
          where: { id: agendamento.id },
          data: { status: 'CONCLUIDO' },
        });
      }
      if (!agendamento.leadId || valor <= 0) return;
      const lead = await tx.lead.findUnique({ where: { id: agendamento.leadId } });
      if (!lead || lead.convertido) return;
      await resolverOuCriarClienteDeLead(tx, lead);
    });
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
