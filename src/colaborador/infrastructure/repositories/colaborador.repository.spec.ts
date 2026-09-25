import { randomBytes } from 'node:crypto';
import { jest } from '@jest/globals';
import { AesGcmService } from '../../../common/crypto/aes-gcm.service.js';
import { HashService } from '../../../common/crypto/hash.service.js';
import { ColaboradorCpfBackfill } from '../colaborador-cpf.backfill.js';
import { ColaboradorRepository } from './colaborador.repository.js';

type Row = { id: string; cpf: string; cpfHash: string | null };

describe('ColaboradorRepository — CPF cifrado em repouso', () => {
  function setup() {
    const env: Record<string, string> = {
      DATA_ENCRYPTION_KEY: randomBytes(32).toString('base64'),
      DATA_ENCRYPTION_PEPPER: randomBytes(32).toString('hex'),
    };
    const config = { get: (k: string) => env[k] };
    const aes = new AesGcmService(config as never);
    const hash = new HashService(config as never);
    aes.onModuleInit();
    hash.onModuleInit();

    // "Banco" em memória: guarda exatamente o que o repositório mandou gravar.
    const rows: Row[] = [];
    const prisma = {
      colaborador: {
        create: jest.fn(async ({ data }: { data: Omit<Row, 'id'> }) => {
          const row = { id: `c${rows.length + 1}`, ...data };
          rows.push(row);
          return row;
        }),
        findUnique: jest.fn(async ({ where }: { where: Partial<Row> }) =>
          rows.find((r) => (where.id ? r.id === where.id : r.cpfHash === where.cpfHash)) ?? null,
        ),
        findMany: jest.fn(async () => rows.filter((r) => r.cpfHash === null)),
        update: jest.fn(async ({ where, data }: { where: { id: string }; data: Partial<Row> }) => {
          const row = rows.find((r) => r.id === where.id)!;
          Object.assign(row, data);
          return row;
        }),
      },
    };
    const repo = new ColaboradorRepository(prisma as never, aes, hash);
    const dados = {
      nome: 'Maria', cpf: '12345678900', telefone: '1', email: 'm@ford.com.br',
      endereco: 'x', registro: 'R1', cargo: 'Vendedora', senhaHash: 'h',
    };
    return { repo, rows, aes, hash, prisma, dados };
  }

  it('grava o CPF cifrado + blind index, e devolve em claro pra aplicação', async () => {
    const { repo, rows, dados } = setup();
    const criado = await repo.create(dados);

    expect(rows[0].cpf).not.toContain('12345678900');
    expect(rows[0].cpfHash).toMatch(/^[0-9a-f]{64}$/);
    expect(criado.cpf).toBe('12345678900');
    expect((await repo.findById(criado.id))!.cpf).toBe('12345678900');
  });

  it('mesmo CPF gera ciphertexts diferentes (IV aleatório), mas é achado pelo hash', async () => {
    const { repo, rows, dados } = setup();
    await repo.create(dados);
    await repo.create({ ...dados, email: 'outra@ford.com.br', registro: 'R2' });

    expect(rows[0].cpf).not.toBe(rows[1].cpf);
    expect(rows[0].cpfHash).toBe(rows[1].cpfHash);
    // formatado ou não, acha o mesmo registro — é isso que mantém o 409 de CPF duplicado
    expect(await repo.findByCpf('123.456.789-00')).not.toBeNull();
    expect(await repo.findByCpf('99999999999')).toBeNull();
  });

  it('backfill cifra CPFs em claro (seed/legado) e é idempotente', async () => {
    const { repo, rows, aes, hash, prisma } = setup();
    rows.push({ id: 'seed1', cpf: '98765432100', cpfHash: null });
    const backfill = new ColaboradorCpfBackfill(prisma as never, aes, hash);

    await backfill.onApplicationBootstrap();
    await backfill.onApplicationBootstrap();

    expect(rows[0].cpf).not.toBe('98765432100');
    expect(prisma.colaborador.update).toHaveBeenCalledTimes(1);
    expect((await repo.findByCpf('98765432100'))!.id).toBe('seed1');
    expect((await repo.findById('seed1'))!.cpf).toBe('98765432100');
  });
});
