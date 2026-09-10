/**
 * @file rbac.e2e-spec.ts
 * @description A matriz de permissões inteira: recurso × verbo × papel.
 *
 * É o teste central da revisão. Ele é a fonte da verdade que o `can.ts` do
 * dealership espelha, e trava dois achados:
 *
 * - P0-1: `/scrapper/sync` e `/scrapper/ford` não têm RolesGuard nenhum, então
 *   qualquer FUNCIONARIO dispara crawl completo + chamadas pagas ao Gemini,
 *   burlando o `@Roles(ADMIN)` do `/sync` equivalente.
 * - P0-3: `PATCH /colaboradores/:id` aceita GERENTE e o DTO permite `role`,
 *   então um GERENTE se promove a ADMIN em uma requisição.
 *
 * A expectativa aqui é "403 para quem não pode" — não o comportamento atual.
 * Os casos marcados abaixo falham até a remediação, por desenho.
 */

import request from 'supertest';
import {
  createTestApp, loginTodos, seedRoles, truncateAll,
  type Papel, type TestApp,
} from './helpers.js';
import * as fx from './fixtures.js';

type Metodo = 'get' | 'post' | 'patch' | 'delete';

interface Caso {
  nome: string;
  metodo: Metodo;
  rota: string;
  body?: unknown;
  /** Papéis que o backend DEVE aceitar. Os demais têm de receber 403. */
  permitidos: Papel[];
}

const TODOS: Papel[] = ['ADMIN', 'GERENTE', 'FUNCIONARIO'];
const ADMIN_GERENTE: Papel[] = ['ADMIN', 'GERENTE'];
const SO_ADMIN: Papel[] = ['ADMIN'];

describe('matriz de RBAC', () => {
  let t: TestApp;
  let tokens: Record<Papel, string>;
  /** ids criados no seed para exercitar PATCH/DELETE sem depender de ordem. */
  const ids: Record<string, string> = {};

  beforeAll(async () => {
    t = await createTestApp();
    await truncateAll(t.prisma);
    await seedRoles(t.prisma);
    tokens = await loginTodos(t.app);

    const c = await t.prisma.cliente.create({ data: fx.cliente('rbac') });
    const e = await t.prisma.estoqueVeiculo.create({ data: fx.estoque('rbac') as never });
    const l = await t.prisma.lead.create({ data: fx.lead('rbac') as never });
    const s = await t.prisma.ordemServico.create({ data: fx.servico('rbac') as never });
    const m = await t.prisma.meta.create({ data: fx.meta('rbac') });
    const f = await t.prisma.financiamento.create({ data: fx.financiamento('rbac') as never });
    const tec = await t.prisma.tecnico.create({ data: fx.tecnico('rbac') as never });
    const av = await t.prisma.avaliacao.create({ data: fx.avaliacao('rbac') });
    Object.assign(ids, {
      cliente: c.id, estoque: e.id, lead: l.id, servico: s.id,
      meta: m.id, financiamento: f.id, tecnico: tec.id, avaliacao: av.id,
    });
  });
  afterAll(async () => { await t.close(); });

  const casos = (): Caso[] => [
    // ── leitura ───────────────────────────────────────────────────────────
    { nome: 'GET /clientes',        metodo: 'get', rota: '/api/clientes',        permitidos: TODOS },
    { nome: 'GET /estoque',         metodo: 'get', rota: '/api/estoque',         permitidos: TODOS },
    { nome: 'GET /leads',           metodo: 'get', rota: '/api/leads',           permitidos: TODOS },
    { nome: 'GET /servicos',        metodo: 'get', rota: '/api/servicos',        permitidos: TODOS },
    { nome: 'GET /metas',           metodo: 'get', rota: '/api/metas',           permitidos: TODOS },
    { nome: 'GET /financiamentos',  metodo: 'get', rota: '/api/financiamentos',  permitidos: TODOS },
    { nome: 'GET /tecnicos',        metodo: 'get', rota: '/api/tecnicos',        permitidos: TODOS },
    { nome: 'GET /dashboard',       metodo: 'get', rota: '/api/dashboard',       permitidos: TODOS },
    { nome: 'GET /colaboradores',   metodo: 'get', rota: '/api/colaboradores',   permitidos: ADMIN_GERENTE },
    { nome: 'GET /sync/history',    metodo: 'get', rota: '/api/sync/history',    permitidos: ADMIN_GERENTE },

    // ── escrita ───────────────────────────────────────────────────────────
    { nome: 'POST /clientes',       metodo: 'post', rota: '/api/clientes',       body: fx.cliente('p'),       permitidos: TODOS },
    { nome: 'POST /leads',          metodo: 'post', rota: '/api/leads',          body: fx.lead('p'),          permitidos: TODOS },
    { nome: 'POST /servicos',       metodo: 'post', rota: '/api/servicos',       body: fx.servico('p'),       permitidos: TODOS },
    { nome: 'POST /estoque',        metodo: 'post', rota: '/api/estoque',        body: fx.estoque('p'),       permitidos: ADMIN_GERENTE },
    { nome: 'POST /metas',          metodo: 'post', rota: '/api/metas',          body: fx.meta('p'),          permitidos: ADMIN_GERENTE },
    { nome: 'POST /financiamentos', metodo: 'post', rota: '/api/financiamentos', body: fx.financiamento('p'), permitidos: ADMIN_GERENTE },
    { nome: 'POST /tecnicos',       metodo: 'post', rota: '/api/tecnicos',       body: fx.tecnico('p'),       permitidos: ADMIN_GERENTE },
    { nome: 'POST /colaboradores',  metodo: 'post', rota: '/api/colaboradores',  body: fx.colaborador('p'),   permitidos: SO_ADMIN },
    { nome: 'POST /auth/register',  metodo: 'post', rota: '/api/auth/register',  body: fx.colaborador('r'),   permitidos: SO_ADMIN },

    // ── exclusão ──────────────────────────────────────────────────────────
    { nome: 'DELETE /clientes/:id',       metodo: 'delete', rota: `/api/clientes/${ids.cliente}`,             permitidos: ADMIN_GERENTE },
    { nome: 'DELETE /leads/:id',          metodo: 'delete', rota: `/api/leads/${ids.lead}`,                   permitidos: ADMIN_GERENTE },
    { nome: 'DELETE /servicos/:id',       metodo: 'delete', rota: `/api/servicos/${ids.servico}`,              permitidos: ADMIN_GERENTE },
    { nome: 'DELETE /avaliacoes/:id',     metodo: 'delete', rota: `/api/avaliacoes/${ids.avaliacao}`,          permitidos: ADMIN_GERENTE },
    { nome: 'DELETE /estoque/:id',        metodo: 'delete', rota: `/api/estoque/${ids.estoque}`,               permitidos: SO_ADMIN },
    { nome: 'DELETE /metas/:id',          metodo: 'delete', rota: `/api/metas/${ids.meta}`,                    permitidos: SO_ADMIN },
    { nome: 'DELETE /financiamentos/:id', metodo: 'delete', rota: `/api/financiamentos/${ids.financiamento}`,   permitidos: SO_ADMIN },
    { nome: 'DELETE /tecnicos/:id',       metodo: 'delete', rota: `/api/tecnicos/${ids.tecnico}`,               permitidos: SO_ADMIN },

    // ── operações caras: sincronização ────────────────────────────────────
    // P0-1: as duas rotas de /scrapper não têm RolesGuard. Cada chamada roda um
    // crawl inteiro do ford.com.br e consome cota paga do Gemini.
    { nome: 'POST /sync',          metodo: 'post', rota: '/api/sync',          body: {}, permitidos: SO_ADMIN },
    { nome: 'POST /scrapper/sync', metodo: 'post', rota: '/api/scrapper/sync', body: {}, permitidos: SO_ADMIN },
    { nome: 'GET /scrapper/ford',  metodo: 'get',  rota: '/api/scrapper/ford',           permitidos: SO_ADMIN },
  ];

  describe('quem não tem permissão recebe 403', () => {
    for (const caso of casos()) {
      const negados = TODOS.filter((p) => !caso.permitidos.includes(p));
      for (const papel of negados) {
        it(`${caso.nome} → ${papel} = 403`, async () => {
          const res = await request(t.app.getHttpServer())
            [caso.metodo](caso.rota)
            .set('Authorization', `Bearer ${tokens[papel]}`)
            .send(caso.body ?? undefined);
          expect(res.status).toBe(403);
        });
      }
    }
  });

  describe('quem tem permissão não recebe 403', () => {
    for (const caso of casos()) {
      for (const papel of caso.permitidos) {
        // As rotas de scraping são seguras aqui: `createTestApp` substitui
        // ScrapperService e SyncService por stubs, então nenhuma coleta real
        // sai para o ford.com.br e nenhuma cota do Gemini é consumida.
        it(`${caso.nome} → ${papel} ≠ 403`, async () => {
          const res = await request(t.app.getHttpServer())
            [caso.metodo](caso.rota)
            .set('Authorization', `Bearer ${tokens[papel]}`)
            .send(caso.body ?? undefined);
          expect(res.status).not.toBe(403);
        });
      }
    }
  });

  it('P0-3: GERENTE não pode alterar o próprio papel para ADMIN', async () => {
    const gerente = await t.prisma.colaborador.findUniqueOrThrow({
      where: { email: 'gerente.teste@ford.com.br' },
    });
    const res = await request(t.app.getHttpServer())
      .patch(`/api/colaboradores/${gerente.id}`)
      .set('Authorization', `Bearer ${tokens.GERENTE}`)
      .send({ role: 'ADMIN' });

    expect(res.status).toBe(403);
    const depois = await t.prisma.colaborador.findUniqueOrThrow({ where: { id: gerente.id } });
    expect(depois.role).toBe('GERENTE');
  });

  it('P0-3: GERENTE não pode trocar a senha de um ADMIN', async () => {
    const admin = await t.prisma.colaborador.findUniqueOrThrow({
      where: { email: 'admin@ford.com.br' },
    });
    const antes = admin.senha;
    const res = await request(t.app.getHttpServer())
      .patch(`/api/colaboradores/${admin.id}`)
      .set('Authorization', `Bearer ${tokens.GERENTE}`)
      .send({ senha: 'SenhaInvadida@2026' });

    expect(res.status).toBe(403);
    const depois = await t.prisma.colaborador.findUniqueOrThrow({ where: { id: admin.id } });
    expect(depois.senha).toBe(antes);
  });
});
