import { readFile, readdir } from 'node:fs/promises';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { afterAll, beforeAll, beforeEach } from 'vitest';
import mysql, { type Pool, type RowDataPacket } from 'mysql2/promise';

const migrationsDir = join(dirname(fileURLToPath(import.meta.url)), '..', 'migrations');

/** Advisory lock serializing the test files that share the test database. */
const schemaLockName = 'okvns_test_schema';
const schemaLockTimeoutSeconds = 120;

/**
 * Hook budget for acquiring the lock. A waiting file blocks for as long as the
 * file ahead of it takes to run, so this must exceed `schemaLockTimeoutSeconds`
 * — otherwise Vitest's default 10s hook timeout fires first and the wait fails
 * as a timeout instead of the lock wait completing (or reporting its own,
 * clearer timeout). The margin lets the lock's own error surface.
 */
const schemaLockHookTimeoutMs = (schemaLockTimeoutSeconds + 10) * 1000;

/**
 * MySQL integration-test support. Tests opt in by setting connection env vars
 * (`OKVNS_TEST_MYSQL_HOST`, ...). When they are absent the suite is skipped so
 * the default `pnpm test` needs no database.
 */
export const mysqlTestConfig = {
  host: process.env.OKVNS_TEST_MYSQL_HOST,
  port: Number.parseInt(process.env.OKVNS_TEST_MYSQL_PORT ?? '3306', 10),
  database: process.env.OKVNS_TEST_MYSQL_DATABASE ?? 'okvns_test',
  user: process.env.OKVNS_TEST_MYSQL_USER ?? 'root',
  password: process.env.OKVNS_TEST_MYSQL_PASSWORD ?? '',
};

/** Whether a test MySQL database is configured. */
export const mysqlTestAvailable = Boolean(mysqlTestConfig.host);

/** Opens a fresh connection pool to the test database. */
function createTestPool(): Pool {
  return mysql.createPool({
    host: mysqlTestConfig.host,
    port: mysqlTestConfig.port,
    database: mysqlTestConfig.database,
    user: mysqlTestConfig.user,
    password: mysqlTestConfig.password,
    connectionLimit: 5,
    waitForConnections: true,
  });
}

/**
 * Registers the lifecycle a MySQL-backed test file needs: a pool, exclusive
 * access to the test database, and a clean schema before each test. Returns an
 * accessor for the pool (only valid once `beforeAll` has run).
 *
 * Vitest runs test files in parallel workers, but every file targets the same
 * database, and `resetSchema` drops the tables. Without exclusivity one file's
 * reset wipes rows out from under another file's in-flight test. Each file
 * holds a MySQL advisory lock for its whole run, so the database-backed files
 * take turns while the rest of the suite still runs in parallel.
 *
 * Taking turns means a file's `beforeAll` blocks for however long the file
 * ahead of it runs, so it gets an explicit `schemaLockHookTimeoutMs` budget
 * rather than Vitest's 10s default.
 */
export function useMysqlTestSchema(): () => Pool {
  let pool: Pool;
  let releaseSchemaLock: (() => Promise<void>) | undefined;

  beforeAll(async () => {
    pool = createTestPool();
    releaseSchemaLock = await acquireSchemaLock(pool);
  }, schemaLockHookTimeoutMs);

  // Tolerate a failed beforeAll (an unreachable database, say) so teardown
  // reports that failure rather than masking it with one of its own.
  afterAll(async () => {
    await releaseSchemaLock?.();
    await pool?.end();
  });

  beforeEach(async () => {
    await resetSchema(pool);
  });

  return () => pool;
}

/**
 * Takes the advisory lock on a dedicated connection, held until the returned
 * release function runs. The lock is session-scoped, so MySQL drops it on its
 * own if a worker dies before releasing.
 */
async function acquireSchemaLock(pool: Pool): Promise<() => Promise<void>> {
  const connection = await pool.getConnection();
  try {
    const [rows] = await connection.query<RowDataPacket[]>('SELECT GET_LOCK(?, ?) AS acquired', [
      schemaLockName,
      schemaLockTimeoutSeconds,
    ]);
    if (rows[0]?.acquired !== 1) {
      throw new Error(
        `Timed out after ${schemaLockTimeoutSeconds}s waiting for the MySQL test schema lock`,
      );
    }
  } catch (error) {
    connection.release();
    throw error;
  }

  return async () => {
    try {
      await connection.query('SELECT RELEASE_LOCK(?)', [schemaLockName]);
    } finally {
      connection.release();
    }
  };
}

/**
 * Drops and recreates OKVNS tables by applying every migration file. Internal
 * to `useMysqlTestSchema`: calling it without holding the lock is what let
 * parallel test files wipe each other's data.
 */
async function resetSchema(pool: Pool): Promise<void> {
  const connection = await pool.getConnection();
  try {
    await connection.query('SET FOREIGN_KEY_CHECKS = 0');
    await connection.query('DROP TABLE IF EXISTS entries');
    await connection.query('DROP TABLE IF EXISTS namespaces');
    await connection.query('SET FOREIGN_KEY_CHECKS = 1');
    const files = (await readdir(migrationsDir)).filter((file) => file.endsWith('.sql')).sort();
    for (const file of files) {
      const sql = await readFile(join(migrationsDir, file), 'utf8');
      for (const statement of splitStatements(sql)) {
        await connection.query(statement);
      }
    }
  } finally {
    connection.release();
  }
}

/** Splits a `.sql` file into individual statements, ignoring comment lines. */
function splitStatements(sql: string): string[] {
  return sql
    .split('\n')
    .filter((line) => !line.trim().startsWith('--'))
    .join('\n')
    .split(';')
    .map((statement) => statement.trim())
    .filter((statement) => statement.length > 0);
}
