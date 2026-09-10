/**
 * @file business-rules.e2e-spec.ts
 * @description Invariantes de negócio que hoje só existem no frontend, ou não
 * existem em lugar nenhum.
 */

import request from 'supertest';
import {
  createTestApp, login, loginTodos, seedRoles, truncateAll, CREDENCIAIS,
  type Papel, type TestApp,
} from './helpers.js';
import * as fx from './fixtures.js';

/** Tabela Price — a mesma fórmula que o dealership usa em useFinanciamentos. */
const parcelaPrice = (valor: number, entrada: number, prazo: number, taxa: number) => {
  const fin = valor - entrada;
  const t = taxa / 100;
  return Math.round((fin * (t * Math.pow(1 + t, prazo))) / (Math.pow(1 + t, prazo) - 1));
};

describe('regras de negócio', () => {
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

  describe('P1-4: financiamento', () => {
    it('parcela coerente com a tabela Price é aceita', async () => {
      const f = fx.financiamento('ok');
      f.parcela = parcelaPrice(f.valor, f.entrada, f.prazo, f.taxa);
      await http().post('/api/financiamentos').set('Authorization', auth()).send(f).expect(201);
    });

    it('parcela divergente do cálculo deve ser recusada', async () => {
      const res = await http()
        .post('/api/financiamentos')
        .set('Authorization', auth())
        .send({ ...fx.financiamento('falsa'), parcela: 1 });
      expect(res.status).toBe(400);
    });

    it('entrada maior que o valor do veículo deve ser recusada', async () => {
      const res = await http()
        .post('/api/financiamentos')
        .set('Authorization', auth())
        .send({ ...fx.financiamento('entrada'), valor: 100000, entrada: 150000 });
      expect(res.status).toBe(400);
    });
  });

  describe('P2: campos derivados não devem vir do cliente', () => {
    it('Meta.atual não deve ser aceita na criação', async () => {
      const res = await http()
        .post('/api/metas')
        .set('Authorization', auth())
        .send({ ...fx.meta('atual'), atual: 999999 });
      // Ou recusa o campo, ou ignora e grava 0 — o que não pode é obedecer.
      if (res.status === 201) {
        expect(res.body.atual).not.toBe(999999);
      } else {
        expect(res.status).toBe(400);
      }
    });

    it('Cliente.ltv não deve ser aceito na criação', async () => {
      const res = await http()
        .post('/api/clientes')
        .set('Authorization', auth())
        .send({ ...fx.cliente('ltv'), ltv: 9_999_999 });
      if (res.status === 201) {
        expect(res.body.ltv).not.toBe(9_999_999);
      } else {
        expect(res.status).toBe(400);
      }
    });
  });

  describe('P1-5: o último ADMIN não pode ser desativado', () => {
    it('desativar o único ADMIN restante deve falhar', async () => {
      const admins = await t.prisma.colaborador.findMany({
        where: { role: 'ADMIN', ativo: true },
      });
      expect(admins).toHaveLength(1);

      const res = await http()
        .delete(`/api/colaboradores/${admins[0].id}`)
        .set('Authorization', auth());
      expect(res.status).toBeGreaterThanOrEqual(400);

      const aindaAtivo = await t.prisma.colaborador.findUniqueOrThrow({
        where: { id: admins[0].id },
      });
      expect(aindaAtivo.ativo).toBe(true);
    });
  });

  describe('P1-1: token precisa deixar de valer quando o colaborador é desativado', () => {
    it('token de colaborador desativado deve ser rejeitado', async () => {
      const tokenFunc = await login(t.app, 'FUNCIONARIO');
      // O token funciona enquanto a conta está ativa.
      await http().get('/api/clientes').set('Authorization', `Bearer ${tokenFunc}`).expect(200);

      await t.prisma.colaborador.update({
        where: { email: CREDENCIAIS.FUNCIONARIO.email },
        data: { ativo: false },
      });

      const res = await http().get('/api/clientes').set('Authorization', `Bearer ${tokenFunc}`);
      expect(res.status).toBe(401);

      await t.prisma.colaborador.update({
        where: { email: CREDENCIAIS.FUNCIONARIO.email },
        data: { ativo: true },
      });
    });

    it('rebaixamento de papel deve valer na requisição seguinte', async () => {
      const tokenGer = await login(t.app, 'GERENTE');
      await http().get('/api/colaboradores').set('Authorization', `Bearer ${tokenGer}`).expect(200);

      await t.prisma.colaborador.update({
        where: { email: CREDENCIAIS.GERENTE.email },
        data: { role: 'FUNCIONARIO' },
      });

      const res = await http().get('/api/colaboradores').set('Authorization', `Bearer ${tokenGer}`);
      expect(res.status).toBe(403);

      await t.prisma.colaborador.update({
        where: { email: CREDENCIAIS.GERENTE.email },
        data: { role: 'GERENTE' },
      });
    });
  });

  describe('P2: chaves de negócio', () => {
    it('dois POSTs concorrentes não devem colidir em código gerado pelo cliente', async () => {
      // O `codigo` vem do frontend como C${Date.now()}; sob concorrência colide.
      // O servidor deveria gerar a sequência.
      const { codigo, ...semCodigo } = fx.cliente('seq');
      void codigo;
      const res = await http()
        .post('/api/clientes')
        .set('Authorization', auth())
        .send(semCodigo);
      expect(res.status).toBe(201);
      expect(res.body.codigo).toBeTruthy();
    });
  });

  describe('P2: KPIs do dashboard', () => {
    it('sla não pode ser um valor fixo no código', async () => {
      await truncateAll(t.prisma);
      await seedRoles(t.prisma);
      const novoToken = await login(t.app, 'ADMIN');

      const vazio = await http()
        .get('/api/dashboard')
        .set('Authorization', `Bearer ${novoToken}`)
        .expect(200);

      await t.prisma.ordemServico.create({ data: fx.servico('sla') as never });
      const comDados = await http()
        .get('/api/dashboard')
        .set('Authorization', `Bearer ${novoToken}`)
        .expect(200);

      // Com banco vazio e com banco populado, um SLA calculado muda — ou ao
      // menos não é a constante 2.3 nos dois casos.
      expect([vazio.body.kpis.sla, comDados.body.kpis.sla]).not.toEqual([2.3, 2.3]);
    });

    it('conversão é 0 quando não há leads, sem divisão por zero', async () => {
      const novoToken = await login(t.app, 'ADMIN');
      const res = await http()
        .get('/api/dashboard')
        .set('Authorization', `Bearer ${novoToken}`)
        .expect(200);
      expect(Number.isFinite(res.body.kpis.conversao)).toBe(true);
    });
  });
});
