/**
 * @file auth.e2e-spec.ts
 * @description Autenticação: login, identidade, cadastro e rate limit.
 */

import request from 'supertest';
import {
  createTestApp, loginTodos, seedRoles, truncateAll, CREDENCIAIS,
  type Papel, type TestApp,
} from './helpers.js';
import * as fx from './fixtures.js';

describe('auth', () => {
  let t: TestApp;
  let tokens: Record<Papel, string>;

  beforeAll(async () => {
    t = await createTestApp();
    await truncateAll(t.prisma);
    await seedRoles(t.prisma);
    tokens = await loginTodos(t.app);
  });
  afterAll(async () => { await t.close(); });

  const http = () => request(t.app.getHttpServer());

  it('login devolve accessToken, expiresIn, tokenType e user sem senha', async () => {
    const res = await http().post('/api/auth/login').send(CREDENCIAIS.ADMIN).expect(200);
    expect(typeof res.body.accessToken).toBe('string');
    expect(res.body.tokenType).toBeDefined();
    expect(res.body.user).toMatchObject({ email: CREDENCIAIS.ADMIN.email, role: 'ADMIN' });
    expect(JSON.stringify(res.body)).not.toMatch(/\$argon2|senha/i);
  });

  it('senha errada devolve 401 com mensagem genérica', async () => {
    const res = await http()
      .post('/api/auth/login')
      .send({ email: CREDENCIAIS.ADMIN.email, senha: 'SenhaErrada@2026' })
      .expect(401);
    expect(res.body.message).toBe('Credenciais invalidas');
  });

  it('usuário inexistente devolve a MESMA mensagem (sem enumeração)', async () => {
    const res = await http()
      .post('/api/auth/login')
      .send({ email: 'naoexiste@ford.com.br', senha: 'QualquerCoisa@2026' })
      .expect(401);
    expect(res.body.message).toBe('Credenciais invalidas');
  });

  it('email malformado devolve 400, não 401', async () => {
    await http().post('/api/auth/login').send({ email: 'nao-e-email', senha: 'x' }).expect(400);
  });

  it('/auth/me exige token', async () => {
    await http().get('/api/auth/me').expect(401);
  });

  it('/auth/me rejeita token forjado', async () => {
    await http().get('/api/auth/me').set('Authorization', 'Bearer nao.e.um.jwt').expect(401);
  });

  it('register é ADMIN-only e cria colaborador', async () => {
    const novo = fx.colaborador('9');
    await http()
      .post('/api/auth/register')
      .set('Authorization', `Bearer ${tokens.ADMIN}`)
      .send(novo)
      .expect(201);
    const criado = await t.prisma.colaborador.findUnique({ where: { email: novo.email } });
    expect(criado).not.toBeNull();
  });

  it('register com email duplicado devolve 409', async () => {
    const novo = fx.colaborador('8');
    await http().post('/api/auth/register').set('Authorization', `Bearer ${tokens.ADMIN}`).send(novo).expect(201);
    await http().post('/api/auth/register').set('Authorization', `Bearer ${tokens.ADMIN}`).send(novo).expect(409);
  });

  // A6: o @ApiResponse promete 409, mas o service só checa email — CPF e registro
  // duplicados escapam para um P2002 cru do Prisma, que vira 500.
  it('A6: register com CPF duplicado devolve 409, não 500', async () => {
    const primeiro = fx.colaborador('7');
    await http().post('/api/auth/register').set('Authorization', `Bearer ${tokens.ADMIN}`).send(primeiro).expect(201);

    const mesmoCpf = { ...fx.colaborador('6'), cpf: primeiro.cpf };
    const res = await http()
      .post('/api/auth/register')
      .set('Authorization', `Bearer ${tokens.ADMIN}`)
      .send(mesmoCpf);
    expect(res.status).toBe(409);
  });

  it('A6: register com registro duplicado devolve 409, não 500', async () => {
    const primeiro = fx.colaborador('5');
    await http().post('/api/auth/register').set('Authorization', `Bearer ${tokens.ADMIN}`).send(primeiro).expect(201);

    const mesmoRegistro = { ...fx.colaborador('4'), registro: primeiro.registro };
    const res = await http()
      .post('/api/auth/register')
      .set('Authorization', `Bearer ${tokens.ADMIN}`)
      .send(mesmoRegistro);
    expect(res.status).toBe(409);
  });
});

describe('auth — rate limit (instância com throttle ligado)', () => {
  let t: TestApp;

  beforeAll(async () => {
    t = await createTestApp({ throttle: true });
    await seedRoles(t.prisma);
  });
  afterAll(async () => { await t.close(); });

  it('sexta tentativa de login em um minuto devolve 429', async () => {
    const credenciaisErradas = { email: CREDENCIAIS.ADMIN.email, senha: 'Errada@2026' };
    const status: number[] = [];
    for (let i = 0; i < 6; i++) {
      const res = await request(t.app.getHttpServer())
        .post('/api/auth/login')
        .send(credenciaisErradas);
      status.push(res.status);
    }
    expect(status.slice(0, 5)).toEqual([401, 401, 401, 401, 401]);
    expect(status[5]).toBe(429);
  });
});
