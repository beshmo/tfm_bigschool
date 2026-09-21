import { readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { createPool, type Pool } from 'mysql2/promise';
import type { MysqlConfig } from '../src/config';

/**
 * Connection settings for the MySQL-gated suites, from `OKVNS_TEST_MYSQL_*`.
 * Resolves `undefined` when they are not set, which makes those suites skip.
 * Locally: `docker compose up -d mysql`, then
 * `OKVNS_TEST_MYSQL_HOST=127.0.0.1 OKVNS_TEST_MYSQL_DATABASE=okvns_test
 *  OKVNS_TEST_MYSQL_USER=okvns OKVNS_TEST_MYSQL_PASSWORD=okvns`.
 */
export function mysqlTestConfig(env: NodeJS.ProcessEnv = process.env): MysqlConfig | undefined {
  const host = env.OKVNS_TEST_MYSQL_HOST;
  const database = env.OKVNS_TEST_MYSQL_DATABASE;
  const user = env.OKVNS_TEST_MYSQL_USER;
  if (!host || !database || !user) {
    return undefined;
  }
  return {
    host,
    port: Number(env.OKVNS_TEST_MYSQL_PORT ?? 3306),
    database,
    user,
    password: env.OKVNS_TEST_MYSQL_PASSWORD ?? '',
    poolLimit: 10,
    connectTimeoutMs: 10_000,
  };
}

/** A pool that can run the multi-statement migration files. */
export function createMigrationPool(config: MysqlConfig): Pool {
  return createPool({
    host: config.host,
    port: config.port,
    database: config.database,
    user: config.user,
    password: config.password,
    multipleStatements: true,
    timezone: 'Z',
  });
}

/** Applies every migration (they are idempotent), exactly as the runner would. */
export async function applyMigrations(pool: Pool): Promise<void> {
  const directory = join(__dirname, '..', 'migrations');
  for (const file of readdirSync(directory)
    .filter((name) => name.endsWith('.sql'))
    .sort()) {
    await pool.query(readFileSync(join(directory, file), 'utf8'));
  }
}

/** Empties both tables between tests (entries first, though the FK cascades). */
export async function resetTables(pool: Pool): Promise<void> {
  await pool.query('DELETE FROM entries');
  await pool.query('DELETE FROM namespaces');
}
