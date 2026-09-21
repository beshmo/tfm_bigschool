import { Logger } from '@nestjs/common';
import type { NestExpressApplication } from '@nestjs/platform-express';
import type { NamespaceRepository } from '@okvns/application';
import request from 'supertest';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { createTestApp, steppingClock } from '../test/create-test-app';
import { InMemoryNamespaceRepository } from './infrastructure/in-memory-namespace-repository';

let app: NestExpressApplication;
const api = () => request(app.getHttpServer());

beforeEach(async () => {
  app = await createTestApp({ repository: new InMemoryNamespaceRepository(steppingClock()) });
});

afterEach(async () => {
  await app.close();
  vi.restoreAllMocks();
});

const errorOf = (body: { error: { code: string; message: string; details?: string[] } }) =>
  body.error;

async function createNamespace(name: string, extra: Record<string, unknown> = {}) {
  return api()
    .post('/namespaces')
    .send({ name, ...extra });
}

async function createEntry(namespace: string, name: string, extra: Record<string, unknown> = {}) {
  return api()
    .post(`/namespaces/${namespace}/entries`)
    .send({ name, value: 'v', ...extra });
}

describe('GET /health and /ready', () => {
  it('GIVEN a running API WHEN probed THEN health and readiness are ok', async () => {
    expect((await api().get('/health')).body).toEqual({ status: 'ok' });
    const ready = await api().get('/ready');
    expect(ready.status).toBe(200);
    expect(ready.body).toEqual({ status: 'ready' });
  });

  it('GIVEN unavailable storage WHEN readiness is probed THEN 503 INTERNAL_ERROR without details', async () => {
    await app.close();
    app = await createTestApp({ readiness: { check: async () => false } });

    const response = await api().get('/ready');

    expect(response.status).toBe(503);
    expect(response.body).toEqual({
      error: { code: 'INTERNAL_ERROR', message: 'Not ready: storage is unavailable.' },
    });
    expect((await api().get('/health')).status).toBe(200);
  });
});

describe('namespaces', () => {
  it('GIVEN a valid name and description WHEN created THEN 201 with timestamps and no entries', async () => {
    const response = await createNamespace('  billing  ', { description: ' Billing settings ' });

    expect(response.status).toBe(201);
    expect(response.body).toEqual({
      name: 'billing',
      description: 'Billing settings',
      entries: [],
      created_at: '2026-01-01T00:00:00.000Z',
      modified_at: '2026-01-01T00:00:00.000Z',
    });
  });

  it('GIVEN no description WHEN created THEN the field is omitted rather than empty', async () => {
    const response = await createNamespace('plain', { description: '   ' });

    expect(response.status).toBe(201);
    expect('description' in response.body).toBe(false);
  });

  it('GIVEN an existing name WHEN created THEN 409 DUPLICATE_NAMESPACE and the original is unchanged', async () => {
    await createNamespace('billing', { description: 'original' });

    const response = await createNamespace('billing', { description: 'other' });

    expect(response.status).toBe(409);
    expect(errorOf(response.body).code).toBe('DUPLICATE_NAMESPACE');
    expect((await api().get('/namespaces/billing')).body.description).toBe('original');
  });

  it.each([
    ['an empty name', { name: '' }, 'Namespace name must not be empty.'],
    ['a disallowed name', { name: 'bad name' }, 'Namespace name must start with a letter'],
    ['an oversized name', { name: 'a'.repeat(129) }, 'at most 128 characters'],
    [
      'an oversized description',
      { name: 'ok', description: 'x'.repeat(1001) },
      'at most 1000 characters',
    ],
  ])(
    'GIVEN %s WHEN created THEN 400 VALIDATION_ERROR before anything is stored',
    async (_label, body, fragment) => {
      const response = await api().post('/namespaces').send(body);

      expect(response.status).toBe(400);
      expect(errorOf(response.body).code).toBe('VALIDATION_ERROR');
      expect(errorOf(response.body).message).toContain(fragment);
      expect((await api().get('/namespaces')).body.total_items).toBe(0);
    },
  );

  it.each([
    ['a missing name', {}, 'name must be a string'],
    ['a non-string name', { name: 5 }, 'name must be a string'],
    ['a non-string description', { name: 'ok', description: 5 }, 'description must be a string'],
    ['an unknown key', { name: 'ok', extra: 1 }, 'property extra should not exist'],
  ])(
    'GIVEN %s WHEN created THEN the body is rejected with per-rule details',
    async (_label, body, detail) => {
      const response = await api().post('/namespaces').send(body);

      expect(response.status).toBe(400);
      expect(errorOf(response.body)).toMatchObject({
        code: 'VALIDATION_ERROR',
        message: 'Request validation failed.',
      });
      expect(errorOf(response.body).details).toContain(detail);
    },
  );

  it('GIVEN no request body WHEN a namespace is created THEN 400, never a 500', async () => {
    const response = await api().post('/namespaces');

    expect(response.status).toBe(400);
    expect(errorOf(response.body).code).toBe('VALIDATION_ERROR');
  });

  it('GIVEN a malformed JSON body WHEN posted THEN 400 VALIDATION_ERROR', async () => {
    const response = await api()
      .post('/namespaces')
      .set('content-type', 'application/json')
      .send('{"name": ');

    expect(response.status).toBe(400);
    expect(errorOf(response.body).code).toBe('VALIDATION_ERROR');
  });

  it('GIVEN a namespace with entries WHEN fetched THEN it is returned with description, entries and timestamps', async () => {
    await createNamespace('billing', { description: 'Billing settings' });
    await createEntry('billing', 'currency', { value: 'EUR', description: 'Default currency' });

    const response = await api().get('/namespaces/billing');

    expect(response.status).toBe(200);
    expect(response.body).toEqual({
      name: 'billing',
      description: 'Billing settings',
      entries: [
        {
          name: 'currency',
          value: 'EUR',
          description: 'Default currency',
          env_dependent: false,
          created_at: '2026-01-01T00:00:01.000Z',
          modified_at: '2026-01-01T00:00:01.000Z',
        },
      ],
      created_at: '2026-01-01T00:00:00.000Z',
      modified_at: '2026-01-01T00:00:01.000Z',
    });
  });

  it('GIVEN a missing namespace WHEN fetched THEN 404 NAMESPACE_NOT_FOUND', async () => {
    const response = await api().get('/namespaces/missing');

    expect(response.status).toBe(404);
    expect(errorOf(response.body).code).toBe('NAMESPACE_NOT_FOUND');
  });

  it('GIVEN an invalid route parameter WHEN fetched THEN 400 VALIDATION_ERROR before the lookup', async () => {
    const response = await api().get('/namespaces/-bad');

    expect(response.status).toBe(400);
    expect(errorOf(response.body).code).toBe('VALIDATION_ERROR');
  });

  it('GIVEN a namespace WHEN renamed THEN entries and description follow, creation stays, modification moves', async () => {
    await createNamespace('old', { description: 'keep me' });
    await createEntry('old', 'k');

    const response = await api().put('/namespaces/old').send({ name: 'new' });

    expect(response.status).toBe(200);
    expect(response.body).toMatchObject({ name: 'new', description: 'keep me' });
    expect(response.body.entries).toHaveLength(1);
    expect(response.body.created_at).toBe('2026-01-01T00:00:00.000Z');
    expect(response.body.modified_at).toBe('2026-01-01T00:00:02.000Z');
    expect((await api().get('/namespaces/old')).status).toBe(404);
  });

  it('GIVEN a namespace WHEN its description is updated or cleared THEN it changes and modification moves', async () => {
    await createNamespace('ns', { description: 'first' });

    const updated = await api().put('/namespaces/ns').send({ description: 'second' });
    expect(updated.body.description).toBe('second');
    expect(updated.body.modified_at).toBe('2026-01-01T00:00:01.000Z');

    const cleared = await api().put('/namespaces/ns').send({ description: '   ' });
    expect(cleared.status).toBe(200);
    expect('description' in cleared.body).toBe(false);
    expect(cleared.body.modified_at).toBe('2026-01-01T00:00:02.000Z');
    expect(cleared.body.created_at).toBe('2026-01-01T00:00:00.000Z');
  });

  it('GIVEN an empty update WHEN applied THEN 400 VALIDATION_ERROR', async () => {
    await createNamespace('ns');

    const response = await api().put('/namespaces/ns').send({});

    expect(response.status).toBe(400);
    expect(errorOf(response.body).message).toBe(
      'A namespace update must contain a name, a description, or both.',
    );
  });

  it('GIVEN a name used by another namespace WHEN renamed THEN 409 and neither changes', async () => {
    await createNamespace('a');
    await createNamespace('b');

    const response = await api().put('/namespaces/a').send({ name: 'b' });

    expect(response.status).toBe(409);
    expect(errorOf(response.body).code).toBe('DUPLICATE_NAMESPACE');
    expect((await api().get('/namespaces/a')).status).toBe(200);
    expect((await api().get('/namespaces/b')).status).toBe(200);
  });

  it('GIVEN a missing namespace WHEN updated or deleted THEN 404', async () => {
    expect((await api().put('/namespaces/missing').send({ name: 'x' })).status).toBe(404);
    expect((await api().delete('/namespaces/missing')).status).toBe(404);
  });

  it('GIVEN a namespace with entries WHEN deleted THEN 204 with no body and everything is gone', async () => {
    await createNamespace('gone');
    await createEntry('gone', 'k');

    const response = await api().delete('/namespaces/gone');

    expect(response.status).toBe(204);
    expect(response.text).toBe('');
    expect((await api().get('/namespaces/gone')).status).toBe(404);
    expect((await api().get('/namespaces/gone/entries')).status).toBe(404);
  });
});

describe('GET /namespaces list controls', () => {
  beforeEach(async () => {
    await createNamespace('charlie');
    await createNamespace('alpha', { description: 'first' });
    await createNamespace('bravo');
    await createEntry('alpha', 'k');
  });

  const names = (body: { items: { name: string }[] }) => body.items.map((item) => item.name);

  it('GIVEN namespaces WHEN listed THEN a page envelope of lightweight items without entries is returned', async () => {
    const response = await api().get('/namespaces');

    expect(response.status).toBe(200);
    expect(response.body).toMatchObject({ page: 1, page_size: 10, total_items: 3, total_pages: 1 });
    expect(names(response.body)).toEqual(['alpha', 'bravo', 'charlie']);
    expect(response.body.items[0]).toEqual({
      name: 'alpha',
      description: 'first',
      created_at: expect.any(String),
      modified_at: expect.any(String),
    });
    expect('entries' in response.body.items[0]).toBe(false);
  });

  it('GIVEN no namespaces WHEN listed THEN there are zero pages', async () => {
    await app.close();
    app = await createTestApp({ repository: new InMemoryNamespaceRepository() });

    expect((await api().get('/namespaces')).body).toEqual({
      items: [],
      page: 1,
      page_size: 10,
      total_items: 0,
      total_pages: 0,
    });
  });

  it.each([10, 50, 100])('GIVEN page_size=%i WHEN listed THEN it is echoed', async (size) => {
    expect((await api().get(`/namespaces?page_size=${size}`)).body.page_size).toBe(size);
  });

  it('GIVEN a small page WHEN paging THEN metadata covers the whole result set', async () => {
    for (let index = 0; index < 12; index++) {
      await createNamespace(`bulk-${String(index).padStart(2, '0')}`);
    }

    const second = await api().get('/namespaces?name=bulk&page=2');

    expect(second.body).toMatchObject({ page: 2, total_items: 12, total_pages: 2 });
    expect(second.body.items).toHaveLength(2);
    expect((await api().get('/namespaces?name=bulk&page=9')).body).toMatchObject({
      items: [],
      total_items: 12,
    });
  });

  it('GIVEN sort and direction WHEN listed THEN the API orders the page', async () => {
    expect(names((await api().get('/namespaces?direction=desc')).body)).toEqual([
      'charlie',
      'bravo',
      'alpha',
    ]);
    expect(names((await api().get('/namespaces?sort=created_at')).body)).toEqual([
      'charlie',
      'alpha',
      'bravo',
    ]);
    expect(names((await api().get('/namespaces?sort=modified_at&direction=desc')).body)).toEqual([
      'alpha',
      'bravo',
      'charlie',
    ]);
  });

  it('GIVEN a name filter WHEN listed THEN it matches case-insensitively and totals describe the filtered set', async () => {
    const response = await api().get('/namespaces?name=AL');

    expect(names(response.body)).toEqual(['alpha']);
    expect(response.body.total_items).toBe(1);
  });

  it('GIVEN wildcard characters in the filter WHEN listed THEN they are literal', async () => {
    expect((await api().get('/namespaces?name=%25')).body.total_items).toBe(0);
    expect((await api().get('/namespaces?name=_')).body.total_items).toBe(0);
  });

  it.each([
    ['page_size=25', 'page_size must be one of: 10, 50, 100'],
    ['page_size=010', 'page_size must be one of: 10, 50, 100'],
    ['page=0', 'page must be an integer greater than or equal to 1'],
    ['page=abc', 'page must be an integer greater than or equal to 1'],
    ['page=1.5', 'page must be an integer greater than or equal to 1'],
    ['sort=value', 'sort must be one of: name, created_at, modified_at'],
    ['sort=env_dependent', 'sort must be one of: name, created_at, modified_at'],
    ['direction=up', 'direction must be one of: asc, desc'],
    ['page=1&page=2', 'page must be a single value'],
  ])('GIVEN ?%s WHEN listed THEN 400 VALIDATION_ERROR naming the rule', async (query, detail) => {
    const response = await api().get(`/namespaces?${query}`);

    expect(response.status).toBe(400);
    expect(errorOf(response.body).code).toBe('VALIDATION_ERROR');
    expect(errorOf(response.body).details).toContain(detail);
  });

  it('GIVEN several bad parameters WHEN listed THEN every violated rule is reported', async () => {
    const response = await api().get('/namespaces?page=0&page_size=7&sort=x');

    expect(errorOf(response.body).details).toHaveLength(3);
  });
});

describe('entries', () => {
  beforeEach(async () => {
    await createNamespace('ns');
  });

  it('GIVEN a valid entry WHEN created THEN 201 with defaults and timestamps', async () => {
    const response = await createEntry('ns', ' key ', { value: '' });

    expect(response.status).toBe(201);
    expect(response.body).toEqual({
      name: 'key',
      value: '',
      env_dependent: false,
      created_at: '2026-01-01T00:00:01.000Z',
      modified_at: '2026-01-01T00:00:01.000Z',
    });
  });

  it('GIVEN description and env_dependent WHEN created THEN both are returned', async () => {
    const response = await createEntry('ns', 'db-host', {
      description: ' the host ',
      env_dependent: true,
    });

    expect(response.body).toMatchObject({ description: 'the host', env_dependent: true });
  });

  it('GIVEN an entry WHEN created THEN the namespace modification time moves', async () => {
    await createEntry('ns', 'k');

    expect((await api().get('/namespaces/ns')).body.modified_at).toBe('2026-01-01T00:00:01.000Z');
  });

  it('GIVEN an existing entry name WHEN created THEN 409 DUPLICATE_ENTRY and the original is unchanged', async () => {
    await createEntry('ns', 'k', { value: 'original' });

    const response = await createEntry('ns', 'k', { value: 'other' });

    expect(response.status).toBe(409);
    expect(errorOf(response.body).code).toBe('DUPLICATE_ENTRY');
    expect((await api().get('/namespaces/ns/entries/k')).body.value).toBe('original');
  });

  it('GIVEN another namespace WHEN the same entry name is created THEN it is accepted', async () => {
    await createNamespace('other');
    await createEntry('ns', 'k');

    expect((await createEntry('other', 'k')).status).toBe(201);
  });

  it('GIVEN a missing namespace WHEN an entry is created or listed THEN 404 NAMESPACE_NOT_FOUND', async () => {
    const created = await createEntry('missing', 'k');
    const listed = await api().get('/namespaces/missing/entries');

    expect([created.status, listed.status]).toEqual([404, 404]);
    expect(errorOf(created.body).code).toBe('NAMESPACE_NOT_FOUND');
    expect(errorOf(listed.body).code).toBe('NAMESPACE_NOT_FOUND');
  });

  it.each([
    ['a missing value', { name: 'k' }, 'value must be a string'],
    ['a non-string value', { name: 'k', value: 5 }, 'value must be a string'],
    [
      'a non-string description',
      { name: 'k', value: 'v', description: 5 },
      'description must be a string',
    ],
    [
      'a non-boolean env_dependent',
      { name: 'k', value: 'v', env_dependent: 'true' },
      'env_dependent must be a boolean value',
    ],
    ['an unknown key', { name: 'k', value: 'v', extra: 1 }, 'property extra should not exist'],
  ])('GIVEN %s WHEN created THEN 400 with per-rule details', async (_label, body, detail) => {
    const response = await api().post('/namespaces/ns/entries').send(body);

    expect(response.status).toBe(400);
    expect(errorOf(response.body).details).toContain(detail);
  });

  it.each([
    ['an invalid name', { name: 'bad name', value: 'v' }],
    ['an oversized description', { name: 'k', value: 'v', description: 'x'.repeat(1001) }],
    ['an oversized value', { name: 'k', value: 'x'.repeat(65_537) }],
    ['a null env_dependent', { name: 'k', value: 'v', env_dependent: null }],
  ])(
    'GIVEN %s WHEN created THEN 400 VALIDATION_ERROR and nothing is stored',
    async (_label, body) => {
      const response = await api().post('/namespaces/ns/entries').send(body);

      expect(response.status).toBe(400);
      expect(errorOf(response.body).code).toBe('VALIDATION_ERROR');
      expect((await api().get('/namespaces/ns/entries')).body.total_items).toBe(0);
    },
  );

  it('GIVEN an entry WHEN fetched THEN it is returned, and a missing one is 404 ENTRY_NOT_FOUND', async () => {
    await createEntry('ns', 'k', { value: 'v', description: 'd', env_dependent: true });

    expect((await api().get('/namespaces/ns/entries/k')).body).toMatchObject({
      name: 'k',
      description: 'd',
      env_dependent: true,
    });
    const missing = await api().get('/namespaces/ns/entries/nope');
    expect(missing.status).toBe(404);
    expect(errorOf(missing.body).code).toBe('ENTRY_NOT_FOUND');
  });

  it('GIVEN an entry WHEN its value changes THEN creation stays and modification moves', async () => {
    await createEntry('ns', 'k', { value: 'old', description: 'doc' });

    const response = await api().put('/namespaces/ns/entries/k').send({ value: 'new' });

    expect(response.status).toBe(200);
    expect(response.body).toMatchObject({ value: 'new', description: 'doc' });
    expect(response.body.created_at).toBe('2026-01-01T00:00:01.000Z');
    expect(response.body.modified_at).toBe('2026-01-01T00:00:02.000Z');
    expect((await api().get('/namespaces/ns')).body.modified_at).toBe('2026-01-01T00:00:02.000Z');
  });

  it('GIVEN an entry WHEN only its description or env_dependent changes THEN the rest is preserved', async () => {
    await createEntry('ns', 'k', { value: 'v', description: 'doc' });

    const described = await api().put('/namespaces/ns/entries/k').send({ description: 'new doc' });
    expect(described.body).toMatchObject({
      value: 'v',
      description: 'new doc',
      env_dependent: false,
    });

    const flagged = await api().put('/namespaces/ns/entries/k').send({ env_dependent: true });
    expect(flagged.body).toMatchObject({ value: 'v', description: 'new doc', env_dependent: true });
    expect(flagged.body.created_at).toBe('2026-01-01T00:00:01.000Z');

    const cleared = await api()
      .put('/namespaces/ns/entries/k')
      .send({ env_dependent: false, description: ' ' });
    expect(cleared.body.env_dependent).toBe(false);
    expect('description' in cleared.body).toBe(false);
  });

  it('GIVEN an entry WHEN renamed THEN it keeps its creation time under the new name', async () => {
    await createEntry('ns', 'old');

    const response = await api().put('/namespaces/ns/entries/old').send({ name: 'new' });

    expect(response.body.name).toBe('new');
    expect(response.body.created_at).toBe('2026-01-01T00:00:01.000Z');
    expect((await api().get('/namespaces/ns/entries/old')).status).toBe(404);
  });

  it('GIVEN another entry name WHEN an entry is renamed to it THEN 409 and neither changes', async () => {
    await createEntry('ns', 'a', { value: '1' });
    await createEntry('ns', 'b', { value: '2' });

    const response = await api().put('/namespaces/ns/entries/a').send({ name: 'b' });

    expect(response.status).toBe(409);
    expect(errorOf(response.body).code).toBe('DUPLICATE_ENTRY');
    expect((await api().get('/namespaces/ns/entries/a')).body.value).toBe('1');
    expect((await api().get('/namespaces/ns/entries/b')).body.value).toBe('2');
  });

  it('GIVEN invalid or missing targets WHEN an entry is updated THEN 400 or 404', async () => {
    await createEntry('ns', 'k');

    expect((await api().put('/namespaces/ns/entries/k').send({ env_dependent: 'x' })).status).toBe(
      400,
    );
    expect((await api().put('/namespaces/ns/entries/nope').send({ value: 'x' })).status).toBe(404);
    expect((await api().put('/namespaces/missing/entries/k').send({ value: 'x' })).status).toBe(
      404,
    );
  });

  it('GIVEN an entry WHEN deleted THEN 204 and the namespace remains', async () => {
    await createEntry('ns', 'k');

    const response = await api().delete('/namespaces/ns/entries/k');

    expect(response.status).toBe(204);
    expect(response.text).toBe('');
    expect((await api().get('/namespaces/ns')).body.entries).toEqual([]);
    expect((await api().delete('/namespaces/ns/entries/k')).body.error.code).toBe(
      'ENTRY_NOT_FOUND',
    );
  });
});

describe('GET /namespaces/:name/entries list controls', () => {
  beforeEach(async () => {
    await createNamespace('ns');
    await createEntry('ns', 'db-host', { env_dependent: true });
    await createEntry('ns', 'db-port');
    await createEntry('ns', 'retries', { env_dependent: true });
  });

  const names = (body: { items: { name: string }[] }) => body.items.map((item) => item.name);

  it('GIVEN entries WHEN listed THEN a page envelope of entries is returned', async () => {
    const response = await api().get('/namespaces/ns/entries');

    expect(response.status).toBe(200);
    expect(response.body).toMatchObject({ page: 1, page_size: 10, total_items: 3, total_pages: 1 });
    expect(names(response.body)).toEqual(['db-host', 'db-port', 'retries']);
    expect(response.body.items[0]).toHaveProperty('env_dependent', true);
  });

  it('GIVEN sorts WHEN listed THEN name, timestamps and env_dependent orderings apply with a name tie-break', async () => {
    expect(
      names((await api().get('/namespaces/ns/entries?sort=name&direction=desc')).body),
    ).toEqual(['retries', 'db-port', 'db-host']);
    expect(names((await api().get('/namespaces/ns/entries?sort=env_dependent')).body)).toEqual([
      'db-port',
      'db-host',
      'retries',
    ]);
    expect(
      names((await api().get('/namespaces/ns/entries?sort=env_dependent&direction=desc')).body),
    ).toEqual(['db-host', 'retries', 'db-port']);
    expect(
      names((await api().get('/namespaces/ns/entries?sort=created_at&direction=desc')).body),
    ).toEqual(['retries', 'db-port', 'db-host']);
    expect(names((await api().get('/namespaces/ns/entries?sort=modified_at')).body)).toEqual([
      'db-host',
      'db-port',
      'retries',
    ]);
  });

  it('GIVEN filters WHEN listed THEN name and env_dependent narrow the result and totals', async () => {
    const byName = await api().get('/namespaces/ns/entries?name=DB');
    expect(names(byName.body)).toEqual(['db-host', 'db-port']);
    expect(byName.body.total_items).toBe(2);

    const flagged = await api().get('/namespaces/ns/entries?env_dependent=true');
    expect(names(flagged.body)).toEqual(['db-host', 'retries']);

    const unflagged = await api().get('/namespaces/ns/entries?env_dependent=false');
    expect(names(unflagged.body)).toEqual(['db-port']);

    const both = await api().get('/namespaces/ns/entries?name=db&env_dependent=true');
    expect(names(both.body)).toEqual(['db-host']);
    expect(both.body.total_items).toBe(1);
  });

  it.each([
    ['page_size=25', 'page_size must be one of: 10, 50, 100'],
    ['sort=value', 'sort must be one of: name, created_at, modified_at, env_dependent'],
    ['direction=sideways', 'direction must be one of: asc, desc'],
    ['env_dependent=yes', 'env_dependent must be true or false'],
    ['env_dependent=true&env_dependent=false', 'env_dependent must be a single value'],
  ])('GIVEN ?%s WHEN listed THEN 400 VALIDATION_ERROR', async (query, detail) => {
    const response = await api().get(`/namespaces/ns/entries?${query}`);

    expect(response.status).toBe(400);
    expect(errorOf(response.body).details).toContain(detail);
  });
});

describe('POST /yaml/import', () => {
  const YAML = `namespaces:
  - name: alpha
    description: first
    entries:
      - name: admin
        value: secret
        description: the key
        env_dependent: true
  - name: beta
    entries:
      - name: token
        value: abc
`;

  it('GIVEN a JSON yaml field WHEN imported THEN 201 with every namespace, description and env_dependent', async () => {
    const response = await api().post('/yaml/import').send({ yaml: YAML });

    expect(response.status).toBe(201);
    expect(response.body.namespaces.map((ns: { name: string }) => ns.name)).toEqual([
      'alpha',
      'beta',
    ]);
    expect(response.body.namespaces[0]).toMatchObject({
      description: 'first',
      entries: [{ name: 'admin', value: 'secret', description: 'the key', env_dependent: true }],
    });
    expect((await api().get('/namespaces/beta/entries/token')).body.env_dependent).toBe(false);
  });

  it('GIVEN the single namespace shape WHEN imported THEN it is accepted', async () => {
    const response = await api()
      .post('/yaml/import')
      .send({ yaml: 'namespace:\n  name: solo\n  entries:\n    - name: k\n      value: v\n' });

    expect(response.status).toBe(201);
    expect(response.body.namespaces).toHaveLength(1);
  });

  it('GIVEN a multipart file WHEN imported THEN the response shape matches the JSON import', async () => {
    const response = await api()
      .post('/yaml/import')
      .attach('file', Buffer.from(YAML, 'utf8'), 'import.yaml');

    expect(response.status).toBe(201);
    expect(response.body.namespaces).toHaveLength(2);
    expect((await api().get('/namespaces/alpha')).status).toBe(200);
  });

  it('GIVEN created_at and modified_at metadata WHEN imported THEN it is accepted but ignored', async () => {
    const response = await api().post('/yaml/import').send({
      yaml: 'namespaces:\n  - name: ns\n    created_at: 2001-01-01T00:00:00.000Z\n    entries: []\n',
    });

    expect(response.status).toBe(201);
    expect(response.body.namespaces[0].created_at).toBe('2026-01-01T00:00:00.000Z');
  });

  it('GIVEN an existing namespace WHEN imported THEN its entries are replaced and its creation time kept', async () => {
    await createNamespace('alpha', { description: 'existing' });
    await createEntry('alpha', 'stale');

    const response = await api().post('/yaml/import').send({ yaml: YAML });

    expect(
      response.body.namespaces[0].entries.map((entry: { name: string }) => entry.name),
    ).toEqual(['admin']);
    expect(response.body.namespaces[0].created_at).toBe('2026-01-01T00:00:00.000Z');
    expect((await api().get('/namespaces/alpha/entries/stale')).status).toBe(404);
  });

  it.each([
    ['an unexpected key', 'namespaces:\n  - name: a\n    entries: []\n    owner: me\n'],
    [
      'a non-string value',
      'namespaces:\n  - name: a\n    entries:\n      - name: k\n        value: 5\n',
    ],
    [
      'a non-boolean env_dependent',
      'namespaces:\n  - name: a\n    entries:\n      - name: k\n        value: v\n        env_dependent: "true"\n',
    ],
    [
      'an oversized description',
      `namespaces:\n  - name: a\n    description: ${'d'.repeat(1001)}\n    entries: []\n`,
    ],
    ['a non-string description', 'namespaces:\n  - name: a\n    description: 5\n    entries: []\n'],
    ['an invalid name', 'namespaces:\n  - name: "!"\n    entries: []\n'],
    ['broken syntax', 'namespaces: [oops'],
  ])(
    'GIVEN YAML with %s WHEN imported THEN 400 INVALID_YAML and storage is untouched',
    async (_label, yaml) => {
      const response = await api().post('/yaml/import').send({ yaml });

      expect(response.status).toBe(400);
      expect(errorOf(response.body).code).toBe('INVALID_YAML');
      expect((await api().get('/namespaces')).body.total_items).toBe(0);
    },
  );

  it('GIVEN duplicate namespaces or entries WHEN imported THEN 409 with the matching code', async () => {
    const namespaces = await api()
      .post('/yaml/import')
      .send({ yaml: 'namespaces:\n  - name: a\n    entries: []\n  - name: a\n    entries: []\n' });
    expect(namespaces.status).toBe(409);
    expect(errorOf(namespaces.body).code).toBe('DUPLICATE_NAMESPACE');

    const entries = await api().post('/yaml/import').send({
      yaml: 'namespaces:\n  - name: a\n    entries:\n      - name: k\n        value: "1"\n      - name: k\n        value: "2"\n',
    });
    expect(entries.status).toBe(409);
    expect(errorOf(entries.body).code).toBe('DUPLICATE_ENTRY');
  });

  it('GIVEN one valid and one invalid namespace WHEN imported THEN nothing is stored', async () => {
    const response = await api().post('/yaml/import').send({
      yaml: 'namespaces:\n  - name: good\n    entries: []\n  - name: "!"\n    entries: []\n',
    });

    expect(response.status).toBe(400);
    expect((await api().get('/namespaces/good')).status).toBe(404);
  });

  it('GIVEN a storage failure mid-import WHEN imported THEN the request fails and storage is unchanged', async () => {
    vi.spyOn(Logger.prototype, 'error').mockImplementation(() => undefined);
    const inner = new InMemoryNamespaceRepository();
    await createNamespace('existing');
    await app.close();
    const failing: NamespaceRepository = Object.assign(Object.create(inner), {
      importNamespaces: async () => {
        throw new Error('disk on fire');
      },
    });
    app = await createTestApp({ repository: failing });

    const response = await api().post('/yaml/import').send({ yaml: YAML });

    expect(response.status).toBe(500);
    expect(await inner.listAll()).toEqual([]);
  });

  it.each([
    ['no body', undefined],
    ['a non-string yaml field', { yaml: 5 }],
    ['an empty object', {}],
  ])('GIVEN %s WHEN imported THEN 400 VALIDATION_ERROR', async (_label, body) => {
    const response = await api().post('/yaml/import').send(body);

    expect(response.status).toBe(400);
    expect(errorOf(response.body).code).toBe('VALIDATION_ERROR');
  });

  it('GIVEN a multipart request without the file field WHEN imported THEN 400 VALIDATION_ERROR', async () => {
    const response = await api().post('/yaml/import').field('note', 'hello');

    expect(response.status).toBe(400);
    expect(errorOf(response.body).code).toBe('VALIDATION_ERROR');
  });

  it('GIVEN a file under the wrong field name WHEN imported THEN 400 VALIDATION_ERROR', async () => {
    const response = await api().post('/yaml/import').attach('upload', Buffer.from(YAML), 'x.yaml');

    expect(response.status).toBe(400);
    expect(errorOf(response.body).code).toBe('VALIDATION_ERROR');
  });

  it('GIVEN an empty file WHEN imported THEN 400 INVALID_YAML', async () => {
    const response = await api().post('/yaml/import').attach('file', Buffer.alloc(0), 'empty.yaml');

    expect(response.status).toBe(400);
    expect(errorOf(response.body).code).toBe('INVALID_YAML');
  });

  it('GIVEN a file that is not UTF-8 WHEN imported THEN 400 INVALID_YAML', async () => {
    const response = await api()
      .post('/yaml/import')
      .attach('file', Buffer.from([0xff, 0xfe, 0xfd, 0x80]), 'binary.yaml');

    expect(response.status).toBe(400);
    expect(errorOf(response.body)).toMatchObject({
      code: 'INVALID_YAML',
      message: 'The uploaded file is not valid UTF-8 text.',
    });
  });

  it('GIVEN a file over 1 MiB WHEN imported THEN 413 VALIDATION_ERROR and nothing is stored', async () => {
    const response = await api()
      .post('/yaml/import')
      .attach('file', Buffer.alloc(1_048_577, 'a'), 'big.yaml');

    expect(response.status).toBe(413);
    expect(errorOf(response.body).code).toBe('VALIDATION_ERROR');
    expect((await api().get('/namespaces')).body.total_items).toBe(0);
  });

  it('GIVEN a JSON body over 1 MiB WHEN imported THEN 413 VALIDATION_ERROR', async () => {
    const response = await api()
      .post('/yaml/import')
      .send({ yaml: `namespaces: []\n# ${'x'.repeat(1_048_600)}` });

    expect(response.status).toBe(413);
    expect(errorOf(response.body).code).toBe('VALIDATION_ERROR');
  });
});

describe('GET /yaml/export', () => {
  const YAML = `namespaces:
  - name: beta
    entries:
      - name: token
        value: abc
  - name: alpha
    description: first
    entries:
      - name: zeta
        value: "1"
      - name: admin
        value: secret
        description: the key
        env_dependent: true
`;

  beforeEach(async () => {
    await api().post('/yaml/import').send({ yaml: YAML });
  });

  it('GIVEN namespaces WHEN exported THEN raw canonical YAML is returned in name order with metadata', async () => {
    const response = await api().get('/yaml/export');

    expect(response.status).toBe(200);
    const { yaml } = response.body as { yaml: string };
    expect(yaml.startsWith('namespaces:\n  - name: alpha\n')).toBe(true);
    expect(yaml.indexOf('name: alpha')).toBeLessThan(yaml.indexOf('name: beta'));
    expect(yaml.indexOf('name: admin')).toBeLessThan(yaml.indexOf('name: zeta'));
    expect(yaml).toContain('description: first');
    expect(yaml).toContain('description: the key');
    expect(yaml).toContain('env_dependent: true');
    expect(yaml).toContain('env_dependent: false');
    expect(yaml).toContain('created_at: 2026-01-01T00:00:00.000Z');
    expect(yaml).toContain('modified_at: 2026-01-01T00:00:00.000Z');
    expect(yaml).not.toContain('```');
  });

  it('GIVEN a namespace name WHEN exported THEN only that namespace is included', async () => {
    const { yaml } = (await api().get('/yaml/export/alpha')).body as { yaml: string };

    expect(yaml).toContain('name: alpha');
    expect(yaml).not.toContain('name: beta');
  });

  it('GIVEN a missing or invalid namespace WHEN exported THEN 404 or 400', async () => {
    const missing = await api().get('/yaml/export/nope');
    expect(missing.status).toBe(404);
    expect(errorOf(missing.body).code).toBe('NAMESPACE_NOT_FOUND');
    expect((await api().get('/yaml/export/-bad')).status).toBe(400);
  });

  it('GIVEN exported YAML WHEN re-imported into a fresh API THEN the same data results', async () => {
    const { yaml } = (await api().get('/yaml/export')).body as { yaml: string };
    await app.close();
    app = await createTestApp();

    const response = await api().post('/yaml/import').send({ yaml });

    expect(response.status).toBe(201);
    expect((await api().get('/namespaces/alpha/entries/admin')).body).toMatchObject({
      value: 'secret',
      description: 'the key',
      env_dependent: true,
    });
  });
});

describe('error contract', () => {
  it('GIVEN an unknown route WHEN requested THEN 404 with code VALIDATION_ERROR (not a *_NOT_FOUND code)', async () => {
    const response = await api().get('/nope');

    expect(response.status).toBe(404);
    expect(errorOf(response.body).code).toBe('VALIDATION_ERROR');
  });

  it('GIVEN an unhandled failure WHEN a request runs THEN 500 with a generic message and no internals', async () => {
    const logged = vi.spyOn(Logger.prototype, 'error').mockImplementation(() => undefined);
    await app.close();
    const broken: NamespaceRepository = Object.assign(
      Object.create(new InMemoryNamespaceRepository()),
      {
        findByName: async () => {
          throw new Error('ECONNREFUSED 10.0.0.5:3306 at /srv/okvns/secret.js');
        },
      },
    );
    app = await createTestApp({ repository: broken });

    const response = await api().get('/namespaces/anything');

    expect(response.status).toBe(500);
    expect(response.body).toEqual({
      error: { code: 'INTERNAL_ERROR', message: 'An unexpected error occurred.' },
    });
    expect(JSON.stringify(response.body)).not.toMatch(/ECONNREFUSED|secret|stack|at /);
    expect(logged).toHaveBeenCalled();
  });

  it('GIVEN any error WHEN returned THEN the body only ever has the safe shape', async () => {
    const responses = [
      await api().get('/namespaces/missing'),
      await api().post('/namespaces').send({}),
      await api().get('/nope'),
    ];

    for (const response of responses) {
      expect(Object.keys(response.body)).toEqual(['error']);
      expect(
        Object.keys(response.body.error).every((key) =>
          ['code', 'message', 'details'].includes(key),
        ),
      ).toBe(true);
    }
  });

  it('GIVEN a cross-origin request WHEN served THEN CORS allows the origin', async () => {
    const response = await api().get('/health').set('Origin', 'http://localhost:5173');

    expect(response.headers['access-control-allow-origin']).toBe('*');
  });
});

describe('OpenAPI documentation', () => {
  it('GIVEN the raw document endpoint WHEN requested THEN every implemented route is documented', async () => {
    const response = await api().get('/docs-json');

    expect(response.status).toBe(200);
    const paths = Object.keys(response.body.paths);
    expect(paths).toEqual(
      expect.arrayContaining([
        '/health',
        '/ready',
        '/namespaces',
        '/namespaces/{name}',
        '/namespaces/{name}/entries',
        '/namespaces/{name}/entries/{entry}',
        '/yaml/import',
        '/yaml/export',
        '/yaml/export/{name}',
      ]),
    );
    expect(response.body.info.title).toBe('OKVNS API');
  });

  it('GIVEN the package version WHEN the document is generated THEN info.version matches it', async () => {
    const { version } = (await import('../package.json')).default;

    expect((await api().get('/docs-json')).body.info.version).toBe(version);
  });

  it('GIVEN the document WHEN inspected THEN it describes pagination, env_dependent, timestamps, multipart and errors', async () => {
    const doc = (await api().get('/docs-json')).body;
    const schemas = doc.components.schemas;

    expect(
      doc.paths['/namespaces'].get.parameters.map((p: { name: string }) => p.name).sort(),
    ).toEqual(['direction', 'name', 'page', 'page_size', 'sort']);
    expect(
      doc.paths['/namespaces/{name}/entries'].get.parameters.map((p: { name: string }) => p.name),
    ).toContain('env_dependent');
    expect(Object.keys(schemas.NamespacePageResponseDto.properties)).toEqual(
      expect.arrayContaining(['items', 'page', 'page_size', 'total_items', 'total_pages']),
    );
    expect(schemas.NamespaceListItemResponseDto.properties).not.toHaveProperty('entries');
    expect(schemas.NamespaceResponseDto.properties).toHaveProperty('entries');
    expect(schemas.EntryResponseDto.properties).toHaveProperty('env_dependent');
    expect(schemas.EntryResponseDto.properties).toHaveProperty('created_at');
    expect(schemas.CreateNamespaceDto.properties.description.maxLength).toBe(1000);
    expect(Object.keys(doc.paths['/yaml/import'].post.requestBody.content)).toEqual(
      expect.arrayContaining(['application/json', 'multipart/form-data']),
    );
    expect(doc.paths['/ready'].get.responses).toHaveProperty('503');
    expect(doc.paths['/namespaces/{name}'].delete.responses).toHaveProperty('204');
  });

  it('GIVEN the Swagger UI endpoint WHEN requested THEN an HTML page is served', async () => {
    const response = await api().get('/docs');

    expect(response.status).toBe(200);
    expect(response.headers['content-type']).toContain('text/html');
  });
});
