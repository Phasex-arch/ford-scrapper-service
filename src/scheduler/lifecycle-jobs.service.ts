import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { PrismaService } from '../../prisma/prisma.service.js';
import { LeadUrgencia, OrdemServicoStatus } from '../../generated/prisma/enums.js';
import { gerarNumeroOS } from '../servico/application/numero-os.util.js';
import { calcularPrioridade, formatarPrazoExibicao } from '../servico/application/prioridade-os.util.js';

const MESES_INATIVIDADE_CLIENTE = 6;
const DIAS_SEM_CONTATO_LEAD = 5;

/**
 * Regras de negócio automáticas de ciclo de vida (auditoria, seção 0) que
 * não têm um evento síncrono claro pra disparar — dependem de tempo
 * passando, não de uma ação de usuário. Cada uma documenta a limitação de
 * dado que a força a ser uma aproximação, não um cálculo perfeito.
 */
@Injectable()
export class LifecycleJobsService {
  private readonly logger = new Logger(LifecycleJobsService.name);

  constructor(private readonly prisma: PrismaService) {}

  /**
   * Agendamento → Ordem de Serviço: ao chegar a data/hora do agendamento,
   * gera a OS automaticamente (em vez de exigir reentrada manual do mesmo
   * dado). Idempotente via ordemServicoId (único) — cada agendamento só
   * gera uma OS.
   * Limitação conhecida: Agendamento não guarda um valor previsto nem um
   * veículo real (schema atual), então a OS nasce com valor=0 e veiculo vem
   * do lead de origem quando existe — precisa ser preenchida manualmente
   * depois, não é um número inventado.
   */
  @Cron(CronExpression.EVERY_10_MINUTES)
  async gerarOrdensDeServicoDeAgendamentos(): Promise<void> {
    const agora = new Date();
    const pendentes = await this.prisma.agendamento.findMany({
      where: { status: 'AGENDADO', ordemServicoId: null, dataHora: { lte: agora } },
      include: { lead: true },
      take: 50,
    });

    for (const agendamento of pendentes) {
      try {
        const os = await this.prisma.ordemServico.create({
          data: {
            numero: gerarNumeroOS(),
            cliente: agendamento.cliente,
            clienteId: agendamento.clienteId,
            veiculo: agendamento.lead?.veiculoInteresse ?? 'Nao informado',
            tipo: agendamento.servico,
            tecnico: agendamento.tecnico ?? 'A definir',
            tecnicoId: agendamento.tecnicoId,
            prazo: formatarPrazoExibicao(agendamento.dataHora),
            prazoData: agendamento.dataHora,
            prioridade: calcularPrioridade(agendamento.dataHora),
            valor: 0,
            status: 'PREVISTO',
          },
        });
        await this.prisma.agendamento.update({
          where: { id: agendamento.id },
          data: { ordemServicoId: os.id },
        });
      } catch (error) {
        this.logger.error(`Falha ao gerar OS pro agendamento ${agendamento.id}`, error as Error);
      }
    }

    if (pendentes.length > 0) {
      this.logger.log(`${pendentes.length} OS geradas automaticamente a partir de agendamentos vencidos`);
    }
  }

  /**
   * Reavalia a urgência de leads sem contato há DIAS_SEM_CONTATO_LEAD dias
   * — sinal real: `ultimoContatoEm` (setado por "Ligar agora"), ou a data
   * de criação se nunca houve contato registrado. Sobe um nível por vez
   * (BAIXA→MEDIA→ALTA). Nunca promove a URGENTE sozinho: esse nível é
   * reservado pro sinal de valor alto calculado na criação (ver
   * public-lead.service.ts), não pra negligência. Leads já convertidos
   * ficam de fora — não faz sentido reavaliar prioridade de venda de quem
   * já comprou.
   */
  @Cron(CronExpression.EVERY_DAY_AT_3AM)
  async reavaliarUrgenciaDosLeads(): Promise<void> {
    const cutoff = new Date(Date.now() - DIAS_SEM_CONTATO_LEAD * 24 * 60 * 60 * 1000);
    const proximoNivel: Partial<Record<LeadUrgencia, LeadUrgencia>> = {
      [LeadUrgencia.BAIXA]: LeadUrgencia.MEDIA,
      [LeadUrgencia.MEDIA]: LeadUrgencia.ALTA,
    };

    const candidatos = await this.prisma.lead.findMany({
      where: {
        convertido: false,
        urgencia: { in: [LeadUrgencia.BAIXA, LeadUrgencia.MEDIA] },
        OR: [
          { ultimoContatoEm: { lt: cutoff } },
          { AND: [{ ultimoContatoEm: null }, { createdAt: { lt: cutoff } }] },
        ],
      },
      take: 200,
    });

    let escalados = 0;
    for (const lead of candidatos) {
      const novaUrgencia = proximoNivel[lead.urgencia];
      if (!novaUrgencia) continue;
      await this.prisma.lead.update({
        where: { id: lead.id },
        data: { urgencia: novaUrgencia },
      });
      escalados += 1;
    }

    if (escalados > 0) {
      this.logger.log(`${escalados} lead(s) escalado(s) por falta de contato (${DIAS_SEM_CONTATO_LEAD}+ dias)`);
    }
  }

  /**
   * Reavalia a prioridade de toda OS em aberto (PREVISTO/ANDAMENTO) com
   * prazoData real — sem isso, uma OS criada "No prazo" ficaria com essa
   * etiqueta pra sempre mesmo depois do prazo vencer, já que nada mais
   * dispara o recálculo (ver auditoria, seção 3). OS concluída/cancelada
   * ou sem prazoData (registro antigo, de antes desse campo existir) fica
   * de fora — não faz sentido "atrasar" um trabalho já encerrado.
   */
  @Cron(CronExpression.EVERY_HOUR)
  async reavaliarPrioridadeDasOS(): Promise<void> {
    const abertas = await this.prisma.ordemServico.findMany({
      where: {
        status: { in: [OrdemServicoStatus.PREVISTO, OrdemServicoStatus.ANDAMENTO] },
        prazoData: { not: null },
      },
      take: 500,
    });

    let atualizadas = 0;
    for (const os of abertas) {
      const novaPrioridade = calcularPrioridade(os.prazoData!);
      if (novaPrioridade === os.prioridade) continue;
      await this.prisma.ordemServico.update({
        where: { id: os.id },
        data: { prioridade: novaPrioridade },
      });
      atualizadas += 1;
    }

    if (atualizadas > 0) {
      this.logger.log(`${atualizadas} OS com prioridade reavaliada`);
    }
  }

  /**
   * Libera sozinha uma reserva de estoque (seção 3) que passou do prazo —
   * sem isso, uma unidade reservada ficaria travada pra sempre se o cliente
   * nunca voltar a fechar negócio, tirando um carro vendável de circulação.
   */
  @Cron(CronExpression.EVERY_10_MINUTES)
  async liberarReservasExpiradas(): Promise<void> {
    const { count } = await this.prisma.estoqueVeiculo.updateMany({
      where: { reservadoClienteId: { not: null }, reservadoAte: { lt: new Date() } },
      data: { status: 'Disponivel', reservadoClienteId: null, reservadoAte: null },
    });

    if (count > 0) {
      this.logger.log(`${count} reserva(s) de estoque liberada(s) automaticamente por expiração`);
    }
  }

  /**
   * Cliente.status → INATIVO depois de MESES_INATIVIDADE_CLIENTE meses sem
   * nenhum sinal de engajamento. Limitação conhecida: Agendamento/
   * OrdemServico guardam cliente como texto livre (sem FK — ver seção 4 da
   * auditoria), então não dá pra cruzar por eles com segurança hoje; o
   * sinal real disponível é `ultimaVisita` (ou createdAt, se nunca setado).
   * Reativação pra ATIVO já acontece no evento real (ver
   * FinanciamentoService.aprovar) — este job só decai, nunca reativa.
   */
  @Cron(CronExpression.EVERY_DAY_AT_4AM)
  async decairStatusDeClientesInativos(): Promise<void> {
    const cutoff = new Date();
    cutoff.setMonth(cutoff.getMonth() - MESES_INATIVIDADE_CLIENTE);

    const { count } = await this.prisma.cliente.updateMany({
      where: {
        status: { not: 'INATIVO' },
        OR: [
          { ultimaVisita: { lt: cutoff } },
          { AND: [{ ultimaVisita: null }, { createdAt: { lt: cutoff } }] },
        ],
      },
      data: { status: 'INATIVO' },
    });

    if (count > 0) {
      this.logger.log(`${count} cliente(s) marcado(s) como INATIVO por ${MESES_INATIVIDADE_CLIENTE}+ meses sem interação`);
    }
  }
}
