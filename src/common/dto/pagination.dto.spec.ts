/**
 * @file pagination.dto.spec.ts
 * @description `buildPaginationMeta` nas bordas. E a funcao que alimenta o
 * envelope que todo mapper do frontend consome, e divide por `limit`.
 */

import { buildPaginationMeta } from './pagination.dto.js';

describe('buildPaginationMeta', () => {
  it('colecao vazia: nenhuma pagina, sem proxima nem anterior', () => {
    expect(buildPaginationMeta(0, 1, 20)).toEqual({
      total: 0, page: 1, limit: 20, totalPages: 0, hasNext: false, hasPrev: false,
    });
  });

  it('total exatamente igual ao limite: uma pagina so', () => {
    const m = buildPaginationMeta(20, 1, 20);
    expect(m.totalPages).toBe(1);
    expect(m.hasNext).toBe(false);
  });

  it('um item alem do limite: abre a segunda pagina', () => {
    const m = buildPaginationMeta(21, 1, 20);
    expect(m.totalPages).toBe(2);
    expect(m.hasNext).toBe(true);
    expect(m.hasPrev).toBe(false);
  });

  it('ultima pagina: tem anterior, nao tem proxima', () => {
    const m = buildPaginationMeta(21, 2, 20);
    expect(m.hasNext).toBe(false);
    expect(m.hasPrev).toBe(true);
  });

  it('pagina alem do fim nao inventa proxima', () => {
    const m = buildPaginationMeta(5, 99, 20);
    expect(m.hasNext).toBe(false);
    expect(m.hasPrev).toBe(true);
  });

  it('limit zero nao produz Infinity nem NaN', () => {
    const m = buildPaginationMeta(10, 1, 0);
    expect(m.totalPages).toBe(0);
    expect(Number.isFinite(m.totalPages)).toBe(true);
  });
});
