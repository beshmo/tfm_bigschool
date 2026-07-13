import { readFile, readdir } from 'node:fs/promises';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import mysql, { type Pool } from 'mysql2/promise';

const migrationsDir = join(dirname(fileURLToPath(import.meta.url)), '..', 'migrations');

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
export function createTestPool(): Pool {
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

/** Drops and recreates OKVNS tables by applying every migration file. */
export async function resetSchema(pool: Pool): Promise<void> {
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
