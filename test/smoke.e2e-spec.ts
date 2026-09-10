import request from 'supertest';
import { createTestApp, loginTodos, seedRoles, truncateAll, type TestApp } from './helpers.js';

describe('harness', () => {
  let t: TestApp;
  let tokens: Record<string, string>;

  beforeAll(async () => {
    t = await createTestApp();
    await truncateAll(t.prisma);
    await seedRoles(t.prisma);
    tokens = await loginTodos(t.app);
  });
  afterAll(async () => { await t.close(); });

  it('health responde sem token', async () => {
    await request(t.app.getHttpServer()).get('/api/health').expect(200);
  });

  it('rota protegida exige token', async () => {
    await request(t.app.getHttpServer()).get('/api/clientes').expect(401);
  });

  it('os tres papeis logam e /auth/me devolve o papel certo', async () => {
    for (const papel of ['ADMIN', 'GERENTE', 'FUNCIONARIO']) {
      const res = await request(t.app.getHttpServer())
        .get('/api/auth/me')
        .set('Authorization', `Bearer ${tokens[papel]}`)
        .expect(200);
      expect(res.body.role).toBe(papel);
    }
  });
});
