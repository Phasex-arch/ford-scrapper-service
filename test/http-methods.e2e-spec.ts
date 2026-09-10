/**
 * @file http-methods.e2e-spec.ts
 * @description Comportamento por verbo HTTP em cada recurso: códigos de status,
 * forma do id, e verbos não suportados.
 */

import request from 'supertest';
import { createTestApp, loginTodos, seedRoles, truncateAll, type Papel, type TestApp } from './helpers.js';
import * as fx from './fixtures.js';

const UUID_INEXISTENTE = '00000000-0000-4000-8000-000000000000';

describe('métodos HTTP', () => {
  let t: TestApp;
  let tokens: Record<Papel, string>;

  beforeAll(async () => {
    t = await createTestApp();
    await truncateAll(t.prisma);
    await seedRoles(t.prisma);
    tokens = await loginTodos(t.app);
  });
  afterAll(async () => { await t.close(); });

  const auth = () => `Bearer ${tokens.ADMIN}`;
  const http = () => request(t.app.getHttpServer());

  const recursos = [
    { rota: 'clientes',       novo: fx.cliente,       patch: { nome: 'Nome Alterado' } },
    { rota: 'estoque',        novo: fx.estoque,       patch: { cor: 'Preto' } },
    { rota: 'leads',          novo: fx.lead,          patch: { necessidade: 'Outra necessidade' } },
    { rota: 'servicos',       novo: fx.servico,       patch: { tipo: 'Outro servico' } },
    { rota: 'metas',          novo: fx.meta,          patch: { responsavel: 'Outro Responsavel' } },
    { rota: 'financiamentos', novo: fx.financiamento, patch: { veiculo: 'Outro Veiculo' } },
    { rota: 'tecnicos',       novo: fx.tecnico,       patch: { especialidade: 'Eletrica' } },
    { rota: 'avaliacoes',     novo: fx.avaliacao,     patch: { nota: 4 } },
  ];

  for (const { rota, novo, patch } of recursos) {
    describe(`/${rota}`, () => {
      let id: string;

      it('POST cria e devolve 201 com id', async () => {
        const res = await http()
          .post(`/api/${rota}`)
          .set('Authorization', auth())
          .send(novo(`m-${rota}`))
          .expect(201);
        expect(res.body.id).toBeDefined();
        id = res.body.id;
      });

      it('GET lista devolve envelope { pagination, data }', async () => {
        const res = await http().get(`/api/${rota}`).set('Authorization', auth()).expect(200);
        expect(Array.isArray(res.body.data)).toBe(true);
        expect(res.body.pagination).toBeDefined();
      });

      it('GET item devolve o registro criado', async () => {
        const res = await http().get(`/api/${rota}/${id}`).set('Authorization', auth()).expect(200);
        expect(res.body.id).toBe(id);
      });

      it('GET item com uuid inexistente devolve 404', async () => {
        await http().get(`/api/${rota}/${UUID_INEXISTENTE}`).set('Authorization', auth()).expect(404);
      });

      it('GET item com id malformado devolve 400', async () => {
        await http().get(`/api/${rota}/nao-e-uuid`).set('Authorization', auth()).expect(400);
      });

      it('PATCH altera o registro', async () => {
        const res = await http()
          .patch(`/api/${rota}/${id}`)
          .set('Authorization', auth())
          .send(patch)
          .expect(200);
        expect(res.body).toMatchObject(patch);
      });

      it('PATCH em uuid inexistente devolve 404', async () => {
        await http()
          .patch(`/api/${rota}/${UUID_INEXISTENTE}`)
          .set('Authorization', auth())
          .send(patch)
          .expect(404);
      });

      it('DELETE devolve 204 sem corpo, e o item deixa de existir', async () => {
        const res = await http().delete(`/api/${rota}/${id}`).set('Authorization', auth()).expect(204);
        expect(res.body).toEqual({});
        await http().get(`/api/${rota}/${id}`).set('Authorization', auth()).expect(404);
      });

      it('DELETE em uuid inexistente devolve 404', async () => {
        await http().delete(`/api/${rota}/${UUID_INEXISTENTE}`).set('Authorization', auth()).expect(404);
      });

      it('PUT não é suportado (404/405)', async () => {
        const res = await http().put(`/api/${rota}`).set('Authorization', auth()).send({});
        expect([404, 405]).toContain(res.status);
      });
    });
  }

  it('POST com código duplicado devolve 409', async () => {
    const payload = fx.cliente('dup');
    await http().post('/api/clientes').set('Authorization', auth()).send(payload).expect(201);
    await http().post('/api/clientes').set('Authorization', auth()).send(payload).expect(409);
  });

  it('rota inexistente devolve 404', async () => {
    await http().get('/api/nao-existe').set('Authorization', auth()).expect(404);
  });
});
