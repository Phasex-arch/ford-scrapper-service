import type { Prisma } from '../../../generated/prisma/client.js';

function gerarCodigoCliente(): string {
  return `C-${Date.now().toString(36).toUpperCase()}`;
}

export interface LeadParaConversao {
  id: string;
  codigo: string;
  clienteId: string | null;
  clienteNome: string;
  telefone: string;
  email: string | null;
  iniciais: string;
}

/**
 * Resolve/cria o Cliente real a partir de um Lead e marca o lead como
 * convertido — mesma regra usada hoje só na aprovação de Financiamento
 * (ver FinanciamentoService.aprovar), extraída aqui porque um segundo
 * evento de negócio real passou a disparar a mesma conversão: uma OS paga
 * (valor > 0) vinculada ao lead chegando em CONCLUIDO (ver
 * ServicoService.update) — fechar uma manutenção de verdade é tão
 * compromisso comercial real quanto financiar um carro; uma "Visita" de
 * valor 0 não é, e por isso não passa por aqui.
 *
 * Busca por email/telefone evita duplicata; se achar um Cliente já
 * existente com nome/telefone diferentes do lead atual, é um recadastro
 * (mesma pessoa entrou em contato de novo) — o dado mais recente vence,
 * mas o antigo fica registrado no histórico do cliente antes de ser
 * sobrescrito (AuditLog `cliente_merge_duplicado`).
 */
export async function resolverOuCriarClienteDeLead(
  tx: Prisma.TransactionClient,
  lead: LeadParaConversao,
): Promise<string> {
  if (lead.clienteId) return lead.clienteId;

  let cliente = lead.email
    ? await tx.cliente.findFirst({ where: { email: lead.email } })
    : null;
  if (!cliente) {
    cliente = await tx.cliente.findFirst({ where: { telefone: lead.telefone } });
  }
  if (!cliente) {
    cliente = await tx.cliente.create({
      data: {
        codigo: gerarCodigoCliente(),
        nome: lead.clienteNome,
        telefone: lead.telefone,
        email: lead.email ?? '',
        iniciais: lead.iniciais,
        segmento: 'Padrao',
        status: 'ATIVO',
        ultimaVisita: new Date(),
      },
    });
  } else if (cliente.nome !== lead.clienteNome || cliente.telefone !== lead.telefone) {
    await tx.auditLog.create({
      data: {
        action: 'cliente_merge_duplicado',
        resource: 'Cliente',
        resourceId: cliente.id,
        details: {
          nomeAntigo: cliente.nome,
          telefoneAntigo: cliente.telefone,
          nomeNovo: lead.clienteNome,
          telefoneNovo: lead.telefone,
          leadDuplicadoId: lead.id,
          leadDuplicadoCodigo: lead.codigo,
        },
      },
    });
    cliente = await tx.cliente.update({
      where: { id: cliente.id },
      data: { nome: lead.clienteNome, telefone: lead.telefone, iniciais: lead.iniciais },
    });
  }

  await tx.lead.update({
    where: { id: lead.id },
    data: { convertido: true, clienteId: cliente.id },
  });

  return cliente.id;
}
