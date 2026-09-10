/**
 * @file colaboradores.e2e-spec.ts
 * @description O recurso de colaboradores, incluindo a dúvida que originou esta
 * revisão: quantos "operadores" o sistema realmente tem.
 *
 * O Swagger nunca afirmou um número — `GET /colaboradores` não tem nem schema de
 * resposta. O "2" vem do log do seed, que conta só `COLABORADORES_SEED` (GERENTE
 * e FUNCIONARIO) e esquece o ADMIN criado à parte em `seedAdmin()`. São 3.
 */

import { execSync } from 'node:child_process';
import request from 'supertest';
import { createTestApp, loginTodos, truncateAll, type Papel, type TestApp } from './helpers.js';
import * as fx from './fixtures.js';

describe('colaboradores', () => {
  let t: TestApp;
  let tokens: Record<Papel, string>;

  beforeAll(async () => {
    t = await createTestApp();
    await truncateAll(t.prisma);

    // Roda o seed de verdade, não o fixture — a afirmação sob teste é sobre o
    // que `prisma db seed` produz.
    execSync('npx prisma db seed', {
      stdio: 'pipe',
      env: { ...process.env, NODE_ENV: 'test' },
    });

    tokens = {
      ADMIN: (await request(t.app.getHttpServer()).post('/api/auth/login')
        .send({ email: 'admin@ford.com.br', senha: 'AdminFord@2026' })).body.accessToken,
      GERENTE: (await request(t.app.getHttpServer()).post('/api/auth/login')
        .send({ email: 'ricardo.costa@ford.com.br', senha: 'GerenteFord@2026' })).body.accessToken,
      FUNCIONARIO: (await request(t.app.getHttpServer()).post('/api/auth/login')
        .send({ email: 'patricia.oliveira@ford.com.br', senha: 'FuncFord@2026' })).body.accessToken,
    };
  });
  afterAll(async () => { await t.close(); });

  const http = () => request(t.app.getHttpServer());
  const auth = () => `Bearer ${tokens.ADMIN}`;

  it('o seed cria 3 colaboradores, não 2 — o log diz "2 colaboradores de exemplo" e omite o ADMIN', async () => {
    const total = await t.prisma.colaborador.count();
    expect(total).toBe(3);

    const porPapel = await t.prisma.colaborador.groupBy({
      by: ['role'],
      _count: { id: true },
    });
    const mapa = Object.fromEntries(porPapel.map((p) => [p.role, p._count.id]));
    expect(mapa).toEqual({ ADMIN: 1, GERENTE: 1, FUNCIONARIO: 1 });
  });

  it('GET /colaboradores reporta o mesmo total na paginação', async () => {
    const res = await http().get('/api/colaboradores').set('Authorization', auth()).expect(200);
    expect(res.body.pagination.total).toBe(3);
    expect(res.body.data).toHaveLength(3);
  });

  it('nenhuma resposta carrega a senha, nem o hash', async () => {
    const lista = await http().get('/api/colaboradores').set('Authorization', auth()).expect(200);
    const texto = JSON.stringify(lista.body);
    expect(texto).not.toMatch(/\$argon2/);
    expect(texto).not.toMatch(/"senha"/);

    const um = await http()
      .get(`/api/colaboradores/${lista.body.data[0].id}`)
      .set('Authorization', auth())
      .expect(200);
    expect(JSON.stringify(um.body)).not.toMatch(/\$argon2|"senha"/);
  });

  it('CPF vem mascarado', async () => {
    const res = await http().get('/api/colaboradores').set('Authorization', auth()).expect(200);
    for (const c of res.body.data) {
      expect(c.cpf).toMatch(/^\*\*\*\.\*\*\*\./);
    }
  });

  it('A7: colaborador desativado sai da listagem padrão', async () => {
    const novo = fx.colaborador('inativo');
    const criado = await http()
      .post('/api/colaboradores')
      .set('Authorization', auth())
      .send(novo)
      .expect(201);

    await http()
      .delete(`/api/colaboradores/${criado.body.id}`)
      .set('Authorization', auth())
      .expect(204);

    const lista = await http().get('/api/colaboradores').set('Authorization', auth()).expect(200);
    const ids = lista.body.data.map((c: { id: string }) => c.id);
    expect(ids).not.toContain(criado.body.id);
  });
});
