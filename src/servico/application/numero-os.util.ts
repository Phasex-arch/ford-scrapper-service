/**
 * Número de OS gerado sempre no servidor — antes vinha do navegador via
 * `Math.random()` (risco real de colisão entre duas OS abertas ao mesmo
 * tempo por pessoas diferentes; ver auditoria, seção 3).
 */
export function gerarNumeroOS(): string {
  return `#${Date.now().toString(36).toUpperCase()}`;
}
