#!/usr/bin/env node
// OKVNS MySQL migration runner.
//
// Applies every `NNN_*.sql` file under ../migrations in filename order, tracking
// applied files in a `schema_migrations` table so re-running is idempotent.
// Reads the same MySQL environment variables as the API runtime configuration.
//
// Usage: node scripts/migrate.mjs   (or: pnpm --filter @okvns/api run migrate)

import { readdir, readFile } from 'node:fs/promises';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import mysql from 'mysql2/promise';

const here = dirname(fileURLToPath(import.meta.url));
const migrationsDir = join(here, '..', 'migrations');

function requireEnv(name) {
  const value = process.env[name]?.trim();
  if (!value) {
    console.error(`[migrate] Missing required environment variable ${name}`);
    process.exit(1);
  }
  return value;
}

async function main() {
  const connection = await mysql.createConnection({
    host: requireEnv('OKVNS_MYSQL_HOST'),
    port: Number.parseInt(process.env.OKVNS_MYSQL_PORT ?? '3306', 10),
    database: requireEnv('OKVNS_MYSQL_DATABASE'),
    user: requireEnv('OKVNS_MYSQL_USER'),
    password: process.env.OKVNS_MYSQL_PASSWORD ?? '',
    multipleStatements: true,
  });

  try {
    await connection.query(
      `CREATE TABLE IF NOT EXISTS schema_migrations (
         filename VARCHAR(255) NOT NULL PRIMARY KEY,
         applied_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
       ) ENGINE = InnoDB DEFAULT CHARSET = utf8mb4`,
    );

    const [appliedRows] = await connection.query('SELECT filename FROM schema_migrations');
    const applied = new Set(appliedRows.map((row) => row.filename));

    const files = (await readdir(migrationsDir))
      .filter((file) => file.endsWith('.sql'))
      .sort();

    let count = 0;
    for (const file of files) {
      if (applied.has(file)) continue;
      const sql = await readFile(join(migrationsDir, file), 'utf8');
      console.log(`[migrate] applying ${file}`);
      await connection.query(sql);
      await connection.query('INSERT INTO schema_migrations (filename) VALUES (?)', [file]);
      count += 1;
    }

    console.log(
      count === 0 ? '[migrate] already up to date' : `[migrate] applied ${count} migration(s)`,
    );
  } finally {
    await connection.end();
  }
}

main().catch((error) => {
  console.error('[migrate] failed:', error.message);
  process.exit(1);
});
