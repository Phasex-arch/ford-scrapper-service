import { DashboardService } from './dashboard.service.js';

/**
 * O snapshot() do dashboard combina ~20 chamadas Prisma em paralelo — mockar
 * tudo isso não pegaria bug nenhum de verdade e ficaria refém da ordem exata
 * dos Promise.all. O que realmente importa (e já quebrou antes, ver os
 * comentários no próprio dashboard.service.ts) é a matemática dos deltas:
 * nunca inventar uma variação quando não há base real de comparação.
 */
describe('DashboardService — cálculo de deltas', () => {
  const service = new DashboardService({} as never) as unknown as {
    pctDelta(atual: number, anterior: number): number | null;
    amostraDelta(
      atual: number,
      atualAmostras: number,
      anterior: number,
      anteriorAmostras: number,
      modo: 'pontos' | 'pct',
    ): number | null;
    pctConversao(a: { leadsTotal: number; leadsConvertidos: number }): number;
    toRecord(rows: Array<Record<string, unknown> & { _count: { id: number } }>, key: string): Record<string, number>;
  };

  describe('pctDelta', () => {
    it('computes a normal percentage variation', () => {
      expect(service.pctDelta(150, 100)).toBe(50);
      expect(service.pctDelta(50, 100)).toBe(-50);
    });

    it('returns null instead of Infinity when there was nothing in the previous period', () => {
      expect(service.pctDelta(10, 0)).toBeNull();
    });

    it('returns 0 (not null) when both periods had nothing', () => {
      expect(service.pctDelta(0, 0)).toBe(0);
    });
  });

  describe('amostraDelta', () => {
    it('returns null when either side has zero samples, even if the raw value looks like a real change', () => {
      expect(service.amostraDelta(4.8, 0, 0, 3, 'pontos')).toBeNull();
      expect(service.amostraDelta(4.8, 3, 0, 0, 'pontos')).toBeNull();
    });

    it('computes a real point delta when both sides have samples', () => {
      expect(service.amostraDelta(4.8, 5, 4.2, 3, 'pontos')).toBeCloseTo(0.6);
    });

    it('computes a real percentage delta when both sides have samples', () => {
      expect(service.amostraDelta(3, 5, 6, 5, 'pct')).toBe(-50);
    });
  });

  describe('pctConversao', () => {
    it('returns 0 instead of NaN when there were no leads', () => {
      expect(service.pctConversao({ leadsTotal: 0, leadsConvertidos: 0 })).toBe(0);
    });

    it('rounds to one decimal place', () => {
      expect(service.pctConversao({ leadsTotal: 3, leadsConvertidos: 1 })).toBeCloseTo(33.3);
    });
  });

  describe('toRecord', () => {
    it('folds groupBy rows into a plain count map', () => {
      const rows = [
        { urgencia: 'ALTA', _count: { id: 4 } },
        { urgencia: 'MEDIA', _count: { id: 2 } },
      ];
      expect(service.toRecord(rows, 'urgencia')).toEqual({ ALTA: 4, MEDIA: 2 });
    });
  });
});
