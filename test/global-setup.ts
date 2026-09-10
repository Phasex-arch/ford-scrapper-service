/**
 * @file test/global-setup.ts
 * @description Prepara o banco `ford_test` uma vez por execução da suíte.
 *
 * Cria o banco se não existir e aplica as migrations. Roda contra o container
 * `ford-postgres` que já fica no ar em localhost:5432.
 *
 * O banco de desenvolvimento nunca é tocado: todo o resto da suíte fala só com
 * a URL definida em test/env.ts.
 */

import { execSync } from 'node:child_process';
import { Client } from 'pg';

const ADMIN_URL = 'postgresql://postgres:postgres@localhost:5432/postgres';
const TEST_URL =
  process.env.TEST_DATABASE_URL ??
  'postgresql://postgres:postgres@localhost:5432/ford_test';

/**
 * Nome do banco extraído da própria URL — assim `TEST_DATABASE_URL` aponta para
 * um banco dedicado e ele é criado de fato. É o que permite duas execuções em
 * paralelo (agentes, CI) sem truncar os dados uma da outra.
 */
const TEST_DB = new URL(TEST_URL).pathname.replace(/^\//, '');

export default async function globalSetup(): Promise<void> {
  const admin = new Client({ connectionString: ADMIN_URL });
  try {
    await admin.connect();
  } catch (e) {
    throw new Error(
      `Não foi possível conectar em ${ADMIN_URL}. O container ford-postgres está no ar? ` +
        `(docker compose up -d postgres). Causa: ${(e as Error).message}`,
    );
  }

  const { rowCount } = await admin.query(
    'SELECT 1 FROM pg_database WHERE datname = $1',
    [TEST_DB],
  );
  if (!rowCount) {
    if (!/^[a-zA-Z0-9_]+$/.test(TEST_DB)) {
      throw new Error(`Nome de banco de teste inválido: ${TEST_DB}`);
    }
    // CREATE DATABASE não aceita parâmetro vinculado; o nome é validado acima.
    await admin.query(`CREATE DATABASE "${TEST_DB}"`);
  }
  await admin.end();

  execSync('npx prisma migrate deploy', {
    stdio: 'inherit',
    env: { ...process.env, DATABASE_URL: TEST_URL },
  });
}
