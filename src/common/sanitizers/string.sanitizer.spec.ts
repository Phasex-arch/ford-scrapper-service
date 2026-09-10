/**
 * @file string.sanitizer.spec.ts
 * @description Os sanitizadores que o projeto ja tem e quase nao usa.
 *
 * `stripXss` e chamado em exatamente um lugar do codigo (a busca de veiculos) e
 * em nenhum caminho de escrita — e a peca que falta para fechar P0-2 no
 * servidor. Estes testes fixam o contrato que a remediacao vai passar a usar.
 */

import { stripXss, escapeForLike, safeFreeText, stripSqlMeta } from './string.sanitizer.js';

describe('stripXss', () => {
  const payloads = [
    '<img src=x onerror=alert(1)>',
    '<script>alert(1)</script>',
    '<svg/onload=alert(1)>',
    '"><iframe src=javascript:alert(1)>',
    '<SCRIPT SRC=//evil/x.js></SCRIPT>',
  ];

  for (const p of payloads) {
    it(`neutraliza ${p.slice(0, 28)}`, () => {
      const limpo = stripXss(p);
      expect(limpo).not.toContain('<');
      expect(limpo).not.toContain('>');
    });
  }

  it('preserva texto legitimo, acentos inclusive', () => {
    expect(stripXss('Orcamento para Ranger 2026, a vista')).toBe(
      'Orcamento para Ranger 2026, a vista',
    );
  });

  it('remove caracteres de controle', () => {
    expect(stripXss('linha\u0009um')).toBe('linhaum');
  });

  it('apara espacos nas pontas', () => {
    expect(stripXss('  Carlos  ')).toBe('Carlos');
  });
});

describe('safeFreeText', () => {
  it('trunca no tamanho pedido', () => {
    expect(safeFreeText('x'.repeat(500), 100)).toHaveLength(100);
  });

  it('sanitiza antes de truncar', () => {
    expect(safeFreeText('<script>alert(1)</script>ok', 200)).not.toContain('<');
  });
});

describe('escapeForLike', () => {
  it('escapa os metacaracteres de LIKE', () => {
    expect(escapeForLike('50%_desconto')).toBe('50\\%\\_desconto');
  });
});

describe('stripSqlMeta', () => {
  // Mantido por completude: o codigo nao monta SQL por concatenacao em lugar
  // nenhum (so Prisma), entao esta funcao nao protege de nada na pratica.
  it('remove aspas e ponto e virgula', () => {
    expect(stripSqlMeta(`a'b";c`)).toBe('abc');
  });
});
