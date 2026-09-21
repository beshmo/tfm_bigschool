// Plain-SQL migration runner: applies migrations/*.sql in filename order and
// records each applied filename in `schema_migrations`.
import { readdir, readFile } from 'node:fs/promises';
import mysql from 'mysql2/promise';

const MIGRATIONS_DIR = new URL('../migrations/', import.meta.url);

function requireEnv(name) {
  const value = process.env[name];
  if (!value) {
    console.error(`[migrate] failed: ${name} is required`);
    process.exit(1);
  }
  return value;
}

const host = requireEnv('OKVNS_MYSQL_HOST');
const database = requireEnv('OKVNS_MYSQL_DATABASE');
const user = requireEnv('OKVNS_MYSQL_USER');
const port = Number(process.env.OKVNS_MYSQL_PORT ?? 3306);
const password = process.env.OKVNS_MYSQL_PASSWORD ?? '';

let connection;
try {
  connection = await mysql.createConnection({
    host,
    port,
    database,
    user,
    password,
    multipleStatements: true,
  });

  await connection.query(
    `CREATE TABLE IF NOT EXISTS schema_migrations (
       filename VARCHAR(255) NOT NULL PRIMARY KEY,
       applied_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
     )`,
  );

  const [rows] = await connection.query('SELECT filename FROM schema_migrations');
  const applied = new Set(rows.map((row) => row.filename));
  const files = (await readdir(MIGRATIONS_DIR)).filter((name) => name.endsWith('.sql')).sort();

  let count = 0;
  for (const file of files) {
    if (applied.has(file)) {
      continue;
    }
    const sql = await readFile(new URL(file, MIGRATIONS_DIR), 'utf8');
    await connection.query(sql);
    await connection.query('INSERT INTO schema_migrations (filename) VALUES (?)', [file]);
    console.log(`[migrate] applied ${file}`);
    count += 1;
  }

  console.log(
    count === 0 ? '[migrate] already up to date' : `[migrate] applied ${count} migration(s)`,
  );
} catch (error) {
  console.error(`[migrate] failed: ${error instanceof Error ? error.message : String(error)}`);
  process.exitCode = 1;
} finally {
  await connection?.end();
}
