import { OrdemServicoPrioridade } from '../../../generated/prisma/enums.js';

/** Janela de "em risco" antes do prazo vencer — abaixo disso mas ainda não
 * vencido, sinaliza atenção sem já contar como atraso real. */
const HORAS_RISCO = 24;

/**
 * Prioridade derivada de prazoData vs agora — nunca mais escolhida à mão
 * (ver auditoria, seção 3: antes era um campo solto que ninguém atualizava).
 */
export function calcularPrioridade(prazoData: Date, agora: Date = new Date()): OrdemServicoPrioridade {
  const horasRestantes = (prazoData.getTime() - agora.getTime()) / 3_600_000;
  if (horasRestantes < 0) return OrdemServicoPrioridade.ATRASADO;
  if (horasRestantes <= HORAS_RISCO) return OrdemServicoPrioridade.RISCO;
  return OrdemServicoPrioridade.OK;
}

/**
 * "22/09/2026, 14:00" — texto de exibição derivado de prazoData, sempre em
 * horário de Brasília: o servidor roda em UTC (container), mas a
 * concessionária é no Brasil — sem isso, a hora exibida ficaria 3h
 * adiantada em relação ao que a equipe realmente combinou.
 */
export function formatarPrazoExibicao(prazoData: Date): string {
  const data = prazoData.toLocaleDateString('pt-BR', { timeZone: 'America/Sao_Paulo' });
  const hora = prazoData.toLocaleTimeString('pt-BR', { timeZone: 'America/Sao_Paulo', hour: '2-digit', minute: '2-digit' });
  return `${data}, ${hora}`;
}
