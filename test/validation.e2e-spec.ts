/**
 * @file validation.e2e-spec.ts
 * @description Validação de entrada e limites de paginação.
 *
 * Trava duas regressões concretas:
 * - `limit` acima de 100 tem de dar 400 (@Max(100) no PaginationQueryDto). Foi
 *   exatamente esse o bug que passou por tsc e só apareceu com a API no ar.
 * - P1-2: os filtros documentados em @ApiQuery precisam FUNCIONAR. Hoje
 *   `forbidNonWhitelisted` + `@Query() pagination: PaginationQueryDto` valida o
 *   objeto de query inteiro contra o DTO de paginação, então qualquer chave
 *   extra devolve 400 — e todo filtro de listagem está morto.
 */

import request from 'supertest';
import { createTestApp, loginTodos, seedRoles, truncateAll, type Papel, type TestApp } from './helpers.js';
import * as fx from './fixtures.js';

describe('validação', () => {
  let t: TestApp;
  let tokens: Record<Papel, string>;

  beforeAll(async () => {
    t = await createTestApp();
    await truncateAll(t.prisma);
    await seedRoles(t.prisma);
    tokens = await loginTodos(t.app);
    await t.prisma.cliente.create({ data: fx.cliente('val') });
    await t.prisma.lead.create({ data: fx.lead('val') as never });
    await t.prisma.avaliacao.create({ data: fx.avaliacao('val') });
  });
  afterAll(async () => { await t.close(); });

  const auth = () => `Bearer ${tokens.ADMIN}`;
  const http = () => request(t.app.getHttpServer());

  describe('paginação', () => {
    it('limit=100 é aceito', async () => {
      await http().get('/api/clientes?limit=100').set('Authorization', auth()).expect(200);
    });

    it('limit=101 é recusado com 400', async () => {
      await http().get('/api/clientes?limit=101').set('Authorization', auth()).expect(400);
    });

    it('limit=0 é recusado com 400', async () => {
      await http().get('/api/clientes?limit=0').set('Authorization', auth()).expect(400);
    });

    it('limit não numérico é recusado com 400', async () => {
      await http().get('/api/clientes?limit=abc').set('Authorization', auth()).expect(400);
    });

    it('page=0 é recusado com 400', async () => {
      await http().get('/api/clientes?page=0').set('Authorization', auth()).expect(400);
    });

    it('sem parâmetros usa o padrão e devolve envelope paginado', async () => {
      const res = await http().get('/api/clientes').set('Authorization', auth()).expect(200);
      expect(res.body.pagination).toMatchObject({ page: 1, limit: 20 });
    });
  });

  describe('P1-2: filtros documentados precisam responder 200', () => {
    const filtros: Array<[string, string]> = [
      ['clientes', 'status=ATIVO'],
      ['clientes', 'segmento=Premium'],
      ['clientes', 'search=Teste'],
      ['leads', 'urgencia=MEDIA'],
      ['leads', 'search=Lead'],
      ['estoque', 'condicao=NOVO'],
      ['estoque', 'segmento=PICAPE'],
      ['colaboradores', 'ativo=true'],
      ['colaboradores', 'role=ADMIN'],
      ['avaliacoes', 'notaMin=4'],
    ];
    for (const [recurso, query] of filtros) {
      it(`GET /${recurso}?${query}`, async () => {
        const res = await http()
          .get(`/api/${recurso}?${query}`)
          .set('Authorization', auth());
        expect(res.status).toBe(200);
      });
    }
  });

  describe('corpo da requisição', () => {
    it('campo fora do whitelist devolve 400', async () => {
      await http()
        .post('/api/clientes')
        .set('Authorization', auth())
        .send({ ...fx.cliente('w'), campoInventado: 'x' })
        .expect(400);
    });

    it('campo obrigatório ausente devolve 400', async () => {
      const { nome, ...semNome } = fx.cliente('s');
      void nome;
      await http().post('/api/clientes').set('Authorization', auth()).send(semNome).expect(400);
    });

    it('enum inválido devolve 400', async () => {
      await http()
        .post('/api/estoque')
        .set('Authorization', auth())
        .send({ ...fx.estoque('e'), condicao: 'USADO_DEMAIS' })
        .expect(400);
    });

    it('email inválido devolve 400', async () => {
      await http()
        .post('/api/clientes')
        .set('Authorization', auth())
        .send({ ...fx.cliente('m'), email: 'nao-e-email' })
        .expect(400);
    });

    it('número negativo onde há @Min(0) devolve 400', async () => {
      await http()
        .post('/api/estoque')
        .set('Authorization', auth())
        .send({ ...fx.estoque('n'), preco: -1 })
        .expect(400);
    });
  });

  describe('limites numéricos superiores', () => {
    it('preço absurdo deve ser recusado', async () => {
      const res = await http()
        .post('/api/estoque')
        .set('Authorization', auth())
        .send({ ...fx.estoque('max'), preco: 1e308 });
      expect(res.status).toBe(400);
    });

    it('prazo de financiamento absurdo deve ser recusado', async () => {
      const res = await http()
        .post('/api/financiamentos')
        .set('Authorization', auth())
        .send({ ...fx.financiamento('max'), prazo: 2_000_000 });
      expect(res.status).toBe(400);
    });

    it('array de opcionais sem teto deve ser recusado', async () => {
      const res = await http()
        .post('/api/estoque')
        .set('Authorization', auth())
        .send({ ...fx.estoque('arr'), opcionais: Array(5000).fill('x') });
      expect(res.status).toBe(400);
    });

    it('status de estoque deve ser enum, não string livre', async () => {
      const res = await http()
        .post('/api/estoque')
        .set('Authorization', auth())
        .send({ ...fx.estoque('st'), status: 'qualquer coisa aqui' });
      expect(res.status).toBe(400);
    });
  });
});
