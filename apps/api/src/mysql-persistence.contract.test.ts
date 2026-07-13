import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import type { Pool } from 'mysql2/promise';
import request from 'supertest';
import { createTestApp } from '../test/create-test-app';
import {
  createTestPool,
  mysqlTestAvailable,
  mysqlTestConfig,
  resetSchema,
} from '../test/mysql-test-db';

/**
 * Contract-level coverage that exercises the API against the real MySQL-backed
 * repository, where persistence behavior (survival across restart) matters.
 * Skipped unless a test database is configured.
 */
describe.skipIf(!mysqlTestAvailable)('MySQL-backed API persistence (contract)', () => {
  let pool: Pool;
  const savedEnv = { ...process.env };

  beforeAll(() => {
    pool = createTestPool();
    process.env.OKVNS_STORAGE_DRIVER = 'mysql';
    process.env.OKVNS_MYSQL_HOST = mysqlTestConfig.host;
    process.env.OKVNS_MYSQL_PORT = String(mysqlTestConfig.port);
    process.env.OKVNS_MYSQL_DATABASE = mysqlTestConfig.database;
    process.env.OKVNS_MYSQL_USER = mysqlTestConfig.user;
    process.env.OKVNS_MYSQL_PASSWORD = mysqlTestConfig.password;
  });

  afterAll(async () => {
    await pool.end();
    process.env = savedEnv;
  });

  beforeEach(async () => {
    await resetSchema(pool);
  });

  it('GIVEN a namespace created through the API WHEN the app restarts THEN the data survives', async () => {
    const first = await createTestApp();
    await request(first.getHttpServer()).post('/namespaces').send({ name: 'users' }).expect(201);
    await request(first.getHttpServer())
      .post('/namespaces/users/entries')
      .send({ name: 'admin', value: 'secret' })
      .expect(201);
    await first.close();

    // A brand-new application instance reconnects to the same database.
    const second = await createTestApp();
    const res = await request(second.getHttpServer()).get('/namespaces/users').expect(200);
    expect(res.body).toEqual({ name: 'users', entries: [{ name: 'admin', value: 'secret' }] });
    await second.close();
  });

  it('GIVEN MySQL is reachable with schema WHEN readiness is probed THEN it reports ready', async () => {
    const app = await createTestApp();
    await request(app.getHttpServer()).get('/ready').expect(200, { status: 'ready' });
    await app.close();
  });
});
