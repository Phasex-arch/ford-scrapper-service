/**
 * Testes HTTP da API (Sprint 3): sobem os controllers REAIS (Auth, Health,
 * Cliente, AuditLog) com a pilha real de segurança — JwtAuthGuard global,
 * RolesGuard, JwtStrategy, ValidationPipe e HttpExceptionFilter — e só
 * substituem o banco (services/repositórios com dublês). Cada cenário bate
 * na API via supertest e confere status code + formato do erro.
 */
import { jest } from '@jest/globals';
import {
  INestApplication,
  NotFoundException,
  ValidationPipe,
} from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { APP_GUARD } from '@nestjs/core';
import { JwtModule, JwtService } from '@nestjs/jwt';
import { PassportModule } from '@nestjs/passport';
import { Test } from '@nestjs/testing';
import { ThrottlerGuard, ThrottlerModule } from '@nestjs/throttler';
import argon2 from 'argon2';
import request from 'supertest';

import { PrismaService } from '../../prisma/prisma.service.js';
import { AuthService } from '../auth/application/auth.service.js';
import { ExchangeCodeService } from '../auth/application/exchange-code.service.js';
import { JwtAuthGuard } from '../auth/infrastructure/guards/jwt-auth.guard.js';
import { RolesGuard } from '../auth/infrastructure/guards/roles.guard.js';
import { ColaboradorAuthRepository } from '../auth/infrastructure/repositories/colaborador-auth.repository.js';
import { JwtStrategy } from '../auth/infrastructure/strategies/jwt.strategy.js';
import { AuthController } from '../auth/presentation/auth.controller.js';
import { AuditLogService } from '../audit-log/application/audit-log.service.js';
import { AuditLogController } from '../audit-log/presentation/audit-log.controller.js';
import { ClienteService } from '../cliente/application/cliente.service.js';
import { ClienteController } from '../cliente/presentation/cliente.controller.js';
import { ColaboradorService } from '../colaborador/application/colaborador.service.js';
import { HttpExceptionFilter } from '../common/filters/http-exception.filter.js';
import { SecurityEventLogger } from '../common/security/security-event.logger.js';
import { HealthController } from '../health/health.controller.js';

const JWT_SECRET = 'segredo-de-teste-com-mais-de-32-caracteres!!';
const SENHA = 'Senha@Forte123';
const UUID_INEXISTENTE = '11111111-1111-4111-8111-111111111111';

type Role = 'ADMIN' | 'GERENTE' | 'FUNCIONARIO';

const colaboradores: Record<string, { id: string; email: string; nome: string; role: Role; ativo: boolean; senha: string }> = {};

describe('API HTTP — autenticação, autorização e erros', () => {
  let app: INestApplication;
  let jwt: JwtService;

  const tokenDe = (role: Role, opts: { expiresIn?: number } = {}) => {
    const c = colaboradores[role];
    return jwt.sign(
      { sub: c.id, email: c.email, role: c.role, nome: c.nome },
      opts.expiresIn !== undefined ? { expiresIn: opts.expiresIn } : undefined,
    );
  };
  const bearer = (token: string) => ({ Authorization: `Bearer ${token}` });

  beforeAll(async () => {
    const senhaHash = await argon2.hash(SENHA, {
      type: argon2.argon2id,
      memoryCost: 19_456,
      timeCost: 2,
      parallelism: 1,
    });
    (['ADMIN', 'GERENTE', 'FUNCIONARIO'] as Role[]).forEach((role, i) => {
      colaboradores[role] = {
        id: `00000000-0000-4000-8000-00000000000${i + 1}`,
        email: `${role.toLowerCase()}@ford.com.br`,
        nome: `Usuário ${role}`,
        role,
        ativo: true,
        senha: senhaHash,
      };
    });
    colaboradores.DESATIVADO = {
      id: '00000000-0000-4000-8000-000000000009',
      email: 'desativado@ford.com.br',
      nome: 'Desativado',
      role: 'FUNCIONARIO',
      ativo: false,
      senha: senhaHash,
    };

    const authRepo = {
      findByEmail: jest.fn(async (email: string) =>
        Object.values(colaboradores).find((c) => c.email === email) ?? null,
      ),
      findById: jest.fn(async (id: string) =>
        Object.values(colaboradores).find((c) => c.id === id) ?? null,
      ),
    };
    const clienteService = {
      list: jest.fn(async () => ({ data: [], total: 0 })),
      findById: jest.fn(async (id: string) => {
        if (id === UUID_INEXISTENTE) throw new NotFoundException('Cliente nao encontrado');
        return { id };
      }),
      create: jest.fn(async (dto: object) => ({ id: 'novo', ...dto })),
      delete: jest.fn(async () => undefined),
    };

    const moduleRef = await Test.createTestingModule({
      imports: [
        ConfigModule.forRoot({
          isGlobal: true,
          ignoreEnvFile: true,
          load: [() => ({ JWT_SECRET, JWT_EXPIRES_IN: '1h' })],
        }),
        PassportModule.register({ defaultStrategy: 'jwt' }),
        JwtModule.register({ secret: JWT_SECRET, signOptions: { expiresIn: '1h', algorithm: 'HS256' } }),
        ThrottlerModule.forRoot({ throttlers: [{ ttl: 60_000, limit: 60 }] }),
      ],
      controllers: [AuthController, HealthController, ClienteController, AuditLogController],
      providers: [
        AuthService,
        ExchangeCodeService,
        JwtStrategy,
        JwtAuthGuard,
        RolesGuard,
        { provide: APP_GUARD, useClass: ThrottlerGuard },
        { provide: APP_GUARD, useClass: JwtAuthGuard },
        { provide: ColaboradorAuthRepository, useValue: authRepo },
        { provide: SecurityEventLogger, useValue: { log: jest.fn(async () => undefined) } },
        { provide: PrismaService, useValue: { auditLog: { create: jest.fn(async () => ({})) } } },
        {
          provide: ColaboradorService,
          useValue: { findById: jest.fn(async (id: string) => Object.values(colaboradores).find((c) => c.id === id)) },
        },
        { provide: ClienteService, useValue: clienteService },
        { provide: AuditLogService, useValue: { list: jest.fn(async () => ({ data: [], total: 0 })) } },
      ],
    }).compile();

    app = moduleRef.createNestApplication();
    app.setGlobalPrefix('api');
    app.useGlobalFilters(new HttpExceptionFilter());
    app.useGlobalPipes(new ValidationPipe({ whitelist: true, forbidNonWhitelisted: true, transform: true }));
    await app.init();
    jwt = moduleRef.get(JwtService);
  });

  afterAll(async () => {
    await app.close();
  });

  const expectErro = (res: request.Response, status: number, error: string) => {
    expect(res.status).toBe(status);
    expect(res.body).toEqual(
      expect.objectContaining({ statusCode: status, error, path: expect.any(String), timestamp: expect.any(String) }),
    );
    expect(res.body.message).toBeDefined();
  };

  describe('endpoints públicos', () => {
    it('GET /api/health responde 200 sem token', async () => {
      const res = await request(app.getHttpServer()).get('/api/health');
      expect(res.status).toBe(200);
      expect(res.body.status).toBe('ok');
    });
  });

  describe('POST /api/auth/login', () => {
    it('200 com credenciais válidas: devolve JWT com sub/role e expiração de 1h', async () => {
      const res = await request(app.getHttpServer())
        .post('/api/auth/login')
        .send({ email: 'admin@ford.com.br', senha: SENHA });

      expect(res.status).toBe(200);
      expect(res.body.accessToken).toEqual(expect.any(String));
      expect(res.body.user).toEqual(expect.objectContaining({ email: 'admin@ford.com.br', role: 'ADMIN' }));

      const payload = jwt.verify<{ sub: string; role: Role; iat: number; exp: number }>(res.body.accessToken);
      expect(payload.sub).toBe(colaboradores.ADMIN.id);
      expect(payload.role).toBe('ADMIN');
      expect(payload.exp - payload.iat).toBe(3600);
    });

    it('401 com senha errada, no formato padronizado de erro', async () => {
      const res = await request(app.getHttpServer())
        .post('/api/auth/login')
        .send({ email: 'admin@ford.com.br', senha: 'SenhaErrada99' });
      expectErro(res, 401, 'UnauthorizedException');
    });

    it('401 com e-mail inexistente, sem revelar que o e-mail não existe', async () => {
      const errada = await request(app.getHttpServer())
        .post('/api/auth/login')
        .send({ email: 'admin@ford.com.br', senha: 'SenhaErrada99' });
      const inexistente = await request(app.getHttpServer())
        .post('/api/auth/login')
        .send({ email: 'ninguem@ford.com.br', senha: SENHA });
      expect(inexistente.status).toBe(401);
      expect(inexistente.body.message).toBe(errada.body.message);
    });

    it('400 quando o corpo é inválido (e-mail malformado, campo extra)', async () => {
      const res = await request(app.getHttpServer())
        .post('/api/auth/login')
        .send({ email: 'nao-e-email', senha: SENHA, admin: true });
      expectErro(res, 400, 'BadRequestException');
      expect(Array.isArray(res.body.message)).toBe(true);
    });
  });

  describe('proteção por JWT (rotas protegidas)', () => {
    it('401 sem token', async () => {
      expectErro(await request(app.getHttpServer()).get('/api/clientes'), 401, 'UnauthorizedException');
    });

    it('401 com token malformado', async () => {
      const res = await request(app.getHttpServer()).get('/api/clientes').set(bearer('isso.nao.e-um-jwt'));
      expectErro(res, 401, 'UnauthorizedException');
    });

    it('401 com token assinado por outro segredo', async () => {
      const forjado = new JwtService({ secret: 'outro-segredo-qualquer-com-32-caracteres!!' }).sign({
        sub: colaboradores.ADMIN.id,
        email: colaboradores.ADMIN.email,
        role: 'ADMIN',
        nome: 'x',
      });
      const res = await request(app.getHttpServer()).get('/api/clientes').set(bearer(forjado));
      expectErro(res, 401, 'UnauthorizedException');
    });

    it('401 com token expirado', async () => {
      const expirado = tokenDe('ADMIN', { expiresIn: -10 });
      const res = await request(app.getHttpServer()).get('/api/clientes').set(bearer(expirado));
      expectErro(res, 401, 'UnauthorizedException');
      // não revela o motivo (expirado x inválido) pra quem chama; o motivo
      // real vai só pro log de segurança (SecurityEventLogger).
      expect(res.body.message).toBe('Nao autenticado');
    });

    it('401 quando o colaborador foi desativado depois de receber o token', async () => {
      const token = jwt.sign({
        sub: colaboradores.DESATIVADO.id,
        email: colaboradores.DESATIVADO.email,
        role: 'FUNCIONARIO',
        nome: 'Desativado',
      });
      const res = await request(app.getHttpServer()).get('/api/clientes').set(bearer(token));
      expectErro(res, 401, 'UnauthorizedException');
    });

    it('200 em GET /api/auth/me com token válido', async () => {
      const res = await request(app.getHttpServer()).get('/api/auth/me').set(bearer(tokenDe('FUNCIONARIO')));
      expect(res.status).toBe(200);
      expect(res.body).toEqual(expect.objectContaining({ email: 'funcionario@ford.com.br', role: 'FUNCIONARIO' }));
    });
  });

  describe('autorização por perfil (RBAC)', () => {
    it('FUNCIONARIO lista clientes (200, resposta paginada)', async () => {
      const res = await request(app.getHttpServer()).get('/api/clientes').set(bearer(tokenDe('FUNCIONARIO')));
      expect(res.status).toBe(200);
      expect(res.body.pagination).toEqual(
        expect.objectContaining({ total: 0, page: 1, limit: 20, totalPages: expect.any(Number) }),
      );
      expect(res.body.data).toEqual([]);
    });

    it('FUNCIONARIO não pode DELETE /clientes/:id → 403', async () => {
      const res = await request(app.getHttpServer())
        .delete(`/api/clientes/${UUID_INEXISTENTE}`)
        .set(bearer(tokenDe('FUNCIONARIO')));
      expectErro(res, 403, 'ForbiddenException');
    });

    it('GERENTE pode DELETE /clientes/:id → 204 sem corpo', async () => {
      const res = await request(app.getHttpServer())
        .delete('/api/clientes/22222222-2222-4222-8222-222222222222')
        .set(bearer(tokenDe('GERENTE')));
      expect(res.status).toBe(204);
      expect(res.text).toBe('');
    });

    it('GET /audit-log: GERENTE → 403, ADMIN → 200', async () => {
      const gerente = await request(app.getHttpServer()).get('/api/audit-log').set(bearer(tokenDe('GERENTE')));
      expectErro(gerente, 403, 'ForbiddenException');

      const admin = await request(app.getHttpServer()).get('/api/audit-log').set(bearer(tokenDe('ADMIN')));
      expect(admin.status).toBe(200);
      expect(admin.body.pagination).toBeDefined();
    });
  });

  describe('semântica REST: status codes de recurso', () => {
    it('404 quando o recurso não existe, no formato padronizado', async () => {
      const res = await request(app.getHttpServer())
        .get(`/api/clientes/${UUID_INEXISTENTE}`)
        .set(bearer(tokenDe('FUNCIONARIO')));
      expectErro(res, 404, 'NotFoundException');
      expect(res.body.message).toBe('Cliente nao encontrado');
    });

    it('400 quando o id da URL não é um UUID', async () => {
      const res = await request(app.getHttpServer()).get('/api/clientes/123').set(bearer(tokenDe('FUNCIONARIO')));
      expectErro(res, 400, 'BadRequestException');
    });

    it('400 em POST /clientes com corpo inválido, listando todos os campos', async () => {
      const res = await request(app.getHttpServer())
        .post('/api/clientes')
        .set(bearer(tokenDe('FUNCIONARIO')))
        .send({ nome: 'A', telefone: '123', email: 'x' });
      expectErro(res, 400, 'BadRequestException');
      expect(res.body.message.length).toBeGreaterThan(2);
    });

    it('201 em POST /clientes com corpo válido', async () => {
      const res = await request(app.getHttpServer())
        .post('/api/clientes')
        .set(bearer(tokenDe('FUNCIONARIO')))
        .send({
          codigo: 'C900',
          nome: 'Cliente de Teste',
          telefone: '(11) 98765-4321',
          email: 'teste@example.com',
          iniciais: 'CT',
          segmento: 'Padrao',
        });
      expect(res.status).toBe(201);
      expect(res.body.codigo).toBe('C900');
    });
  });

  describe('limite de tentativas de login', () => {
    it('429 depois de exceder 5 tentativas por minuto em /auth/login', async () => {
      const codigos: number[] = [];
      for (let i = 0; i < 6; i++) {
        const res = await request(app.getHttpServer())
          .post('/api/auth/login')
          .send({ email: 'admin@ford.com.br', senha: 'SenhaErrada99' });
        codigos.push(res.status);
      }
      expect(codigos[codigos.length - 1]).toBe(429);
    });
  });
});
