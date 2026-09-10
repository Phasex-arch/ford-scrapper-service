/**
 * @file contracts.e2e-spec.ts
 * @description Contrato de resposta consumido pelo dealership.
 *
 * Os mappers do frontend (shared/api/mappers.ts) dependem destes nomes de campo
 * e destes formatos de enum. Uma renomeação no backend que passe por aqui
 * quebraria a tela em silêncio — foi exatamente esse o modo de falha que gerou
 * esta revisão.
 */

import request from 'supertest';
import { createTestApp, loginTodos, seedRoles, truncateAll, type Papel, type TestApp } from './helpers.js';
import * as fx from './fixtures.js';

describe('contratos de resposta', () => {
  let t: TestApp;
  let tokens: Record<Papel, string>;

  beforeAll(async () => {
    t = await createTestApp();
    await truncateAll(t.prisma);
    await seedRoles(t.prisma);
    tokens = await loginTodos(t.app);
    await t.prisma.cliente.create({ data: fx.cliente('ct') });
    await t.prisma.estoqueVeiculo.create({ data: fx.estoque('ct') as never });
    await t.prisma.lead.create({ data: fx.lead('ct') as never });
    await t.prisma.ordemServico.create({ data: fx.servico('ct') as never });
    await t.prisma.meta.create({ data: fx.meta('ct') });
    await t.prisma.financiamento.create({ data: fx.financiamento('ct') as never });
    await t.prisma.tecnico.create({ data: fx.tecnico('ct') as never });
    await t.prisma.avaliacao.create({ data: fx.avaliacao('ct') });
  });
  afterAll(async () => { await t.close(); });

  const http = () => request(t.app.getHttpServer());
  const auth = () => `Bearer ${tokens.ADMIN}`;

  const pegarPrimeiro = async (rota: string) => {
    const res = await http().get(`/api/${rota}?limit=100`).set('Authorization', auth()).expect(200);
    expect(res.body.pagination).toMatchObject({
      total: expect.any(Number), page: expect.any(Number), limit: expect.any(Number),
      totalPages: expect.any(Number), hasNext: expect.any(Boolean), hasPrev: expect.any(Boolean),
    });
    expect(res.body.data.length).toBeGreaterThan(0);
    return res.body.data[0];
  };

  it('cliente tem os campos que toCliente consome', async () => {
    const c = await pegarPrimeiro('clientes');
    expect(c).toMatchObject({
      id: expect.any(String), codigo: expect.any(String), nome: expect.any(String),
      telefone: expect.any(String), email: expect.any(String), status: expect.any(String),
      veiculosCount: expect.any(Number), ltv: expect.any(Number),
      iniciais: expect.any(String), segmento: expect.any(String),
    });
    expect(c.status).toMatch(/^(ATIVO|INATIVO|POTENCIAL)$/);
  });

  it('estoque tem os campos que toEstoque consome', async () => {
    const e = await pegarPrimeiro('estoque');
    expect(e).toMatchObject({
      codigo: expect.any(String), modelo: expect.any(String), versao: expect.any(String),
      ano: expect.any(String), motor: expect.any(String), transmissao: expect.any(String),
      condicao: expect.any(String), status: expect.any(String), preco: expect.any(Number),
      segmento: expect.any(String), cor: expect.any(String), quantidade: expect.any(Number),
    });
    expect(Array.isArray(e.opcionais)).toBe(true);
    expect(e.condicao).toMatch(/^(NOVO|SEMINOVO)$/);
    expect(e.segmento).toMatch(/^(SUV|PICAPE|SEDAN|HATCH|OUTRO)$/);
  });

  it('lead tem os campos que toLead consome', async () => {
    const l = await pegarPrimeiro('leads');
    expect(l).toMatchObject({
      codigo: expect.any(String), clienteNome: expect.any(String), iniciais: expect.any(String),
      veiculoInteresse: expect.any(String), necessidade: expect.any(String),
      urgencia: expect.any(String), valorEstimado: expect.any(Number), telefone: expect.any(String),
    });
    expect(l.urgencia).toMatch(/^(URGENTE|ALTA|MEDIA|BAIXA)$/);
  });

  it('ordem de serviço tem os campos que toServico consome', async () => {
    const s = await pegarPrimeiro('servicos');
    expect(s).toMatchObject({
      numero: expect.any(String), cliente: expect.any(String), veiculo: expect.any(String),
      tipo: expect.any(String), tecnico: expect.any(String), prazo: expect.any(String),
      prioridade: expect.any(String), status: expect.any(String),
    });
    expect(s.prioridade).toMatch(/^(OK|RISCO|ATRASADO)$/);
    expect(s.status).toMatch(/^(PREVISTO|ANDAMENTO|CONCLUIDO|CANCELADO)$/);
  });

  it('meta tem os campos que toMeta consome', async () => {
    const m = await pegarPrimeiro('metas');
    expect(m).toMatchObject({
      codigo: expect.any(String), titulo: expect.any(String), periodo: expect.any(String),
      indicador: expect.any(String), atual: expect.any(Number), alvo: expect.any(Number),
      unidade: expect.any(String), responsavel: expect.any(String),
      lowerIsBetter: expect.any(Boolean),
    });
  });

  it('financiamento tem os campos que toFinanciamento consome', async () => {
    const f = await pegarPrimeiro('financiamentos');
    expect(f).toMatchObject({
      codigo: expect.any(String), clienteNome: expect.any(String), iniciais: expect.any(String),
      veiculo: expect.any(String), valor: expect.any(Number), entrada: expect.any(Number),
      prazo: expect.any(Number), taxa: expect.any(Number), parcela: expect.any(Number),
      status: expect.any(String), data: expect.any(String),
    });
    expect(f.status).toMatch(/^(APROVADO|ANALISE|PENDENTE|REPROVADO)$/);
  });

  it('técnico tem os campos que toTecnico consome', async () => {
    const tec = await pegarPrimeiro('tecnicos');
    expect(tec).toMatchObject({
      nome: expect.any(String), iniciais: expect.any(String),
      especialidade: expect.any(String), status: expect.any(String),
    });
    expect(tec.status).toMatch(/^(LIVRE|OCUPADO|PAUSA|AUSENTE)$/);
  });

  it('avaliação tem os campos que toAvaliacao consome', async () => {
    const a = await pegarPrimeiro('avaliacoes');
    expect(a).toMatchObject({
      cliente: expect.any(String), nota: expect.any(Number),
      data: expect.any(String), texto: expect.any(String),
    });
  });

  it('dashboard devolve o bloco de kpis que useDashboard normaliza', async () => {
    const res = await http().get('/api/dashboard').set('Authorization', auth()).expect(200);
    expect(res.body.kpis).toMatchObject({
      leads: expect.any(Number), agendamentos: expect.any(Number),
      receita: expect.any(Number), conversao: expect.any(Number),
      sla: expect.any(Number), nota: expect.any(Number), estoque: expect.any(Number),
    });
  });
});
