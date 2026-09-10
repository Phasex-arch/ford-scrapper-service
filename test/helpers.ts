/**
 * @file test/helpers.ts
 * @description Bootstrap da aplicação para os testes de API.
 *
 * `createTestApp` replica a configuração de src/main.ts — prefixo `/api`,
 * ValidationPipe com whitelist/forbidNonWhitelisted e HttpExceptionFilter. Sem
 * isso a suíte validaria uma aplicação diferente da que roda em produção, e
 * justamente os testes de validação e de formato de erro passariam por engano.
 *
 * O rate limit é desligado por padrão: é global (60 req/min, e 5/min no login) e
 * a matriz de RBAC faz centenas de requisições. Os testes que *medem* rate limit
 * pedem `{ throttle: true }` e ganham uma instância própria com o throttler real.
 */

import { ValidationPipe, type INestApplication } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { ThrottlerStorage } from '@nestjs/throttler';
import request from 'supertest';

import { AppModule } from '../src/app.module.js';
import { HttpExceptionFilter } from '../src/common/filters/http-exception.filter.js';
import { PrismaService } from '../prisma/prisma.service.js';
import { ScrapperService } from '../src/scrapper/application/scrapper.js';
import { SyncService } from '../src/vehicle/sync/sync.service.js';

export interface TestApp {
  app: INestApplication;
  prisma: PrismaService;
  close: () => Promise<void>;
}

export async function createTestApp(
  opts: { throttle?: boolean } = {},
): Promise<TestApp> {
  const builder = Test.createTestingModule({ imports: [AppModule] });

  if (!opts.throttle) {
    // O ThrottlerGuard entra por APP_GUARD, e `overrideGuard` não alcança guard
    // registrado assim. O ponto de desligamento é o armazenamento: devolvendo
    // sempre 1 acerto, nada nunca estoura o limite.
    builder.overrideProvider(ThrottlerStorage).useValue({
      increment: async () => ({
        totalHits: 1, timeToExpire: 60, isBlocked: false, timeToBlockExpire: 0,
      }),
    });
  }

  // Scraping é substituído por stub, sempre. As rotas precisam continuar
  // acessíveis para que a matriz de RBAC as exercite, mas um teste de
  // autorização não pode rastejar o ford.com.br nem gastar cota do Gemini —
  // e justamente os casos que provam P0-1 passam pelo guard hoje.
  builder.overrideProvider(ScrapperService).useValue({
    scrapeAll: async () => ({ vehicles: [], collectedAt: new Date().toISOString() }),
  });
  builder.overrideProvider(SyncService).useValue({
    executeSyncRun: async () => ({
      status: 'completed', vehicles_found: 0, vehicles_saved: 0, errors_count: 0,
    }),
    getSyncHistory: async () => [],
  });

  const moduleRef = await builder.compile();
  const app = moduleRef.createNestApplication();

  // Espelho de src/main.ts (sem helmet/cors, que são irrelevantes in-process).
  app.setGlobalPrefix('api');
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
      transformOptions: { enableImplicitConversion: true },
      stopAtFirstError: false,
      disableErrorMessages: false,
    }),
  );
  app.useGlobalFilters(new HttpExceptionFilter());

  await app.init();

  const prisma = app.get(PrismaService);
  return {
    app,
    prisma,
    close: async () => {
      await prisma.$disconnect();
      await app.close();
    },
  };
}

/** Papéis semeados por `seedRoles`. */
export const CREDENCIAIS = {
  ADMIN: { email: 'admin@ford.com.br', senha: 'AdminFord@2026' },
  GERENTE: { email: 'gerente.teste@ford.com.br', senha: 'GerenteTeste@2026' },
  FUNCIONARIO: { email: 'func.teste@ford.com.br', senha: 'FuncTeste@2026' },
} as const;

export type Papel = keyof typeof CREDENCIAIS;

export async function login(app: INestApplication, papel: Papel): Promise<string> {
  const res = await request(app.getHttpServer())
    .post('/api/auth/login')
    .send(CREDENCIAIS[papel]);
  if (res.status !== 200 && res.status !== 201) {
    throw new Error(
      `login de ${papel} falhou: ${res.status} ${JSON.stringify(res.body)}`,
    );
  }
  return res.body.accessToken as string;
}

/** Os três tokens em uma chamada — login é limitado, então peça uma vez por suíte. */
export async function loginTodos(
  app: INestApplication,
): Promise<Record<Papel, string>> {
  return {
    ADMIN: await login(app, 'ADMIN'),
    GERENTE: await login(app, 'GERENTE'),
    FUNCIONARIO: await login(app, 'FUNCIONARIO'),
  };
}

const TABELAS = [
  'AuditLog', 'Avaliacao', 'Lead', 'OrdemServico', 'Financiamento', 'Meta',
  'Cliente', 'EstoqueVeiculo', 'Tecnico', 'Colaborador',
  'Imagem', 'Cor', 'Motorizacao', 'Fontes', 'Vehicle', 'SyncRun',
];

export async function truncateAll(prisma: PrismaService): Promise<void> {
  const lista = TABELAS.map((t) => `"${t}"`).join(', ');
  await prisma.$executeRawUnsafe(
    `TRUNCATE TABLE ${lista} RESTART IDENTITY CASCADE`,
  );
}

/** Um colaborador por papel — o mínimo para exercitar a matriz de permissões. */
export async function seedRoles(prisma: PrismaService): Promise<void> {
  const argon2 = await import('argon2');
  const hash = (senha: string) =>
    argon2.hash(senha, {
      type: argon2.argon2id,
      memoryCost: 19_456,
      timeCost: 2,
      parallelism: 1,
    });

  const base = [
    { ...CREDENCIAIS.ADMIN, role: 'ADMIN', nome: 'Admin Teste', cpf: '11111111111', registro: 'T-ADM-001' },
    { ...CREDENCIAIS.GERENTE, role: 'GERENTE', nome: 'Gerente Teste', cpf: '22222222222', registro: 'T-GER-001' },
    { ...CREDENCIAIS.FUNCIONARIO, role: 'FUNCIONARIO', nome: 'Func Teste', cpf: '33333333333', registro: 'T-FUN-001' },
  ];

  for (const c of base) {
    await prisma.colaborador.upsert({
      where: { email: c.email },
      update: {},
      create: {
        nome: c.nome,
        cpf: c.cpf,
        telefone: '(11) 90000-0000',
        email: c.email,
        endereco: 'Av. Teste, 1',
        registro: c.registro,
        cargo: 'Teste',
        role: c.role as never,
        senha: await hash(c.senha),
        ativo: true,
      },
    });
  }
}
