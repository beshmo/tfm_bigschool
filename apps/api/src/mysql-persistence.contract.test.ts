import type { NestExpressApplication } from '@nestjs/platform-express';
import request from 'supertest';
import { afterAll, afterEach, beforeAll, describe, expect, it } from 'vitest';
import { createTestApp } from '../test/create-test-app';
import {
  applyMigrations,
  createMigrationPool,
  mysqlTestConfig,
  resetTables,
} from '../test/mysql-test-db';

/** Runs only when `OKVNS_TEST_MYSQL_*` points at a disposable database. */
const config = mysqlTestConfig();

describe.skipIf(!config)('API with the MySQL driver', () => {
  const saved: Record<string, string | undefined> = {};
  const overrides: Record<string, string> = {
    OKVNS_STORAGE_DRIVER: 'mysql',
    OKVNS_MYSQL_HOST: config?.host ?? '',
    OKVNS_MYSQL_PORT: String(config?.port ?? 3306),
    OKVNS_MYSQL_DATABASE: config?.database ?? '',
    OKVNS_MYSQL_USER: config?.user ?? '',
    OKVNS_MYSQL_PASSWORD: config?.password ?? '',
  };
  let app: NestExpressApplication | undefined;

  beforeAll(async () => {
    for (const [key, value] of Object.entries(overrides)) {
      saved[key] = process.env[key];
      process.env[key] = value;
    }
    const pool = createMigrationPool(config!);
    await applyMigrations(pool);
    await resetTables(pool);
    await pool.end();
  });

  afterEach(async () => {
    await app?.close();
    app = undefined;
  });

  afterAll(() => {
    for (const [key, value] of Object.entries(saved)) {
      if (value === undefined) delete process.env[key];
      else process.env[key] = value;
    }
  });

  it('GIVEN the migrated database WHEN readiness is probed THEN the API is ready', async () => {
    app = await createTestApp();

    expect((await request(app.getHttpServer()).get('/ready')).body).toEqual({ status: 'ready' });
  });

  it('GIVEN stored data WHEN the API restarts THEN namespaces, descriptions and env markers survive', async () => {
    app = await createTestApp();
    const first = request(app.getHttpServer());
    await first.post('/namespaces').send({ name: 'durable', description: 'kept' });
    await first
      .post('/namespaces/durable/entries')
      .send({ name: 'k', value: 'v', description: 'entry doc', env_dependent: true });
    await app.close();

    app = await createTestApp();
    const response = await request(app.getHttpServer()).get('/namespaces/durable');

    expect(response.status).toBe(200);
    expect(response.body).toMatchObject({
      description: 'kept',
      entries: [{ name: 'k', value: 'v', description: 'entry doc', env_dependent: true }],
    });
  });

  it('GIVEN concurrent creations of one namespace WHEN raced over HTTP THEN one 201 and the rest 409', async () => {
    app = await createTestApp();

    const responses = await Promise.all(
      Array.from({ length: 5 }, () =>
        request(app!.getHttpServer()).post('/namespaces').send({ name: 'raced' }),
      ),
    );

    expect(responses.filter((response) => response.status === 201)).toHaveLength(1);
    expect(responses.filter((response) => response.status === 409)).toHaveLength(4);
  });

  it('GIVEN an unreachable database WHEN readiness is probed THEN the API reports 503', async () => {
    const previousPort = process.env.OKVNS_MYSQL_PORT;
    process.env.OKVNS_MYSQL_PORT = '1';
    try {
      app = await createTestApp();

      const response = await request(app.getHttpServer()).get('/ready');

      expect(response.status).toBe(503);
      expect(response.body.error.code).toBe('INTERNAL_ERROR');
    } finally {
      process.env.OKVNS_MYSQL_PORT = previousPort;
    }
  });
});
