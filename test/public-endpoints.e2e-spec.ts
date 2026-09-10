/**
 * @file public-endpoints.e2e-spec.ts
 * @description Superfície não autenticada: `POST /public/leads` e todo o
 * `/avaliacoes`.
 *
 * P0-2 é o achado mais grave da revisão e começa aqui: `nome` do lead público
 * não é sanitizado, vira `Lead.clienteNome`, e o dealership renderiza esse campo
 * com `dangerouslySetInnerHTML` na busca global — XSS armazenado, sem
 * autenticação, contra a sessão de um ADMIN cujo JWT está em localStorage.
 *
 * O projeto JÁ tem `stripXss` e `safeFreeText`; eles só não são chamados em
 * nenhum caminho de escrita. O teste exige que passem a ser.
 */

import request from 'supertest';
import { createTestApp, seedRoles, truncateAll, type TestApp } from './helpers.js';
import * as fx from './fixtures.js';

const PAYLOADS_XSS = [
  '<img src=x onerror=alert(1)>',
  '<script>alert(1)</script>',
  '<svg/onload=alert(1)>',
  '"><iframe src=javascript:alert(1)>',
];

describe('endpoints públicos', () => {
  let t: TestApp;
  const fetchOriginal = global.fetch;

  beforeAll(async () => {
    // Intercepta a chamada ao Resend: o endpoint precisa das variáveis
    // configuradas para chegar a persistir, mas nenhum email deve sair daqui.
    global.fetch = (async () =>
      new Response(JSON.stringify({ id: 'email-de-teste' }), { status: 200 })) as typeof fetch;

    t = await createTestApp();
    await truncateAll(t.prisma);
    await seedRoles(t.prisma);
  });
  afterAll(async () => {
    global.fetch = fetchOriginal;
    await t.close();
  });

  const http = () => request(t.app.getHttpServer());

  describe('POST /public/leads', () => {
    it('aceita sem token e persiste o lead', async () => {
      const res = await http().post('/api/public/leads').send(fx.leadPublico('ok')).expect(201);
      expect(res.body.id).toBeDefined();
      const lead = await t.prisma.lead.findUnique({ where: { id: res.body.id } });
      expect(lead).not.toBeNull();
    });

    it('recusa corpo inválido com 400', async () => {
      await http().post('/api/public/leads').send({ nome: 'ab' }).expect(400);
    });

    it('recusa campo fora do whitelist com 400', async () => {
      await http()
        .post('/api/public/leads')
        .send({ ...fx.leadPublico('x'), urgencia: 'URGENTE', extra: 1 })
        .expect(400);
    });

    // ── P0-2 ────────────────────────────────────────────────────────────────
    for (const [i, payload] of PAYLOADS_XSS.entries()) {
      it(`P0-2: payload de XSS em 'nome' não pode ser persistido cru (#${i + 1})`, async () => {
        const res = await http()
          .post('/api/public/leads')
          .send({ ...fx.leadPublico(`xss${i}`), nome: payload });

        // Recusar com 400 é o melhor desfecho; sanitizar e aceitar também serve.
        // O que não pode é gravar as tags intactas.
        if (res.status === 400) return;
        expect(res.status).toBe(201);

        const lead = await t.prisma.lead.findUniqueOrThrow({ where: { id: res.body.id } });
        expect(lead.clienteNome).not.toContain('<');
        expect(lead.clienteNome).not.toContain('>');
      });
    }

    it('P0-2: mensagem e veículo de interesse também precisam ser sanitizados', async () => {
      const res = await http().post('/api/public/leads').send({
        ...fx.leadPublico('xss-msg'),
        mensagem: 'Quero orçamento <script>fetch("//evil")</script> urgente',
        veiculoInteresse: 'Ranger <img src=x onerror=1>',
      });
      if (res.status === 400) return;
      expect(res.status).toBe(201);

      const lead = await t.prisma.lead.findUniqueOrThrow({ where: { id: res.body.id } });
      expect(lead.necessidade).not.toMatch(/<script|<img/i);
      expect(lead.veiculoInteresse).not.toMatch(/<script|<img/i);
    });
  });

  describe('GET/POST /avaliacoes (público)', () => {
    it('GET lista sem token', async () => {
      await http().get('/api/avaliacoes').expect(200);
    });

    it('GET stats sem token devolve total e notaMedia', async () => {
      const res = await http().get('/api/avaliacoes/stats').expect(200);
      expect(res.body).toHaveProperty('total');
      expect(res.body).toHaveProperty('notaMedia');
    });

    it('nota fora de 1..5 é recusada', async () => {
      await http().post('/api/avaliacoes').send({ ...fx.avaliacao('n0'), nota: 0 }).expect(400);
      await http().post('/api/avaliacoes').send({ ...fx.avaliacao('n9'), nota: 9 }).expect(400);
    });

    it('P0-2: texto de avaliação pública não pode ser persistido cru', async () => {
      const res = await http().post('/api/avaliacoes').send({
        ...fx.avaliacao('xss'),
        texto: 'Bom atendimento <script>alert(1)</script> recomendo',
      });
      if (res.status === 400) return;
      expect(res.status).toBe(201);

      const av = await t.prisma.avaliacao.findUniqueOrThrow({ where: { id: res.body.id } });
      expect(av.texto).not.toMatch(/<script/i);
    });

    it('P1-3: escrita anônima não deve gerar AuditLog sem autor', async () => {
      await truncateAll(t.prisma);
      await seedRoles(t.prisma);
      await http().post('/api/avaliacoes').send(fx.avaliacao('audit'));
      const orfaos = await t.prisma.auditLog.count({ where: { userId: null } });
      expect(orfaos).toBe(0);
    });
  });
});

describe('endpoints públicos — rate limit real', () => {
  let t: TestApp;

  beforeAll(async () => {
    t = await createTestApp({ throttle: true });
  });
  afterAll(async () => { await t.close(); });

  it('POST /public/leads estoura em 4 requisições (limite 3/min)', async () => {
    const status: number[] = [];
    for (let i = 0; i < 4; i++) {
      const res = await request(t.app.getHttpServer())
        .post('/api/public/leads')
        .send(fx.leadPublico(`rate${i}`));
      status.push(res.status);
    }
    expect(status[3]).toBe(429);
  });

  // P1-3: /avaliacoes não tem @Throttle próprio e herda os 60/min globais,
  // enquanto a outra rota pública tem 3/min. Escrita anônima precisa de teto
  // mais apertado do que 60 inserções por minuto por IP.
  it('P1-3: POST /avaliacoes precisa de limite próprio, mais apertado que 60/min', async () => {
    const status: number[] = [];
    for (let i = 0; i < 11; i++) {
      const res = await request(t.app.getHttpServer())
        .post('/api/avaliacoes')
        .send(fx.avaliacao(`rate${i}`));
      status.push(res.status);
    }
    expect(status).toContain(429);
  });
});
