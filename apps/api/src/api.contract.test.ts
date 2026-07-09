import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import type { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { createTestApp } from '../test/create-test-app';

let app: INestApplication;
let http: ReturnType<typeof request>;

beforeEach(async () => {
  app = await createTestApp();
  http = request(app.getHttpServer());
});

afterEach(async () => {
  await app.close();
});

describe('Health and readiness', () => {
  it('GET /health returns ok', async () => {
    const res = await http.get('/health');
    expect(res.status).toBe(200);
    expect(res.body).toEqual({ status: 'ok' });
  });

  it('GET /ready returns ready', async () => {
    const res = await http.get('/ready');
    expect(res.status).toBe(200);
    expect(res.body).toEqual({ status: 'ready' });
  });
});

describe('Namespace endpoints', () => {
  it('POST /namespaces creates a namespace', async () => {
    const res = await http.post('/namespaces').send({ name: 'users' });
    expect(res.status).toBe(201);
    expect(res.body).toEqual({ name: 'users', entries: [] });
  });

  it('POST /namespaces rejects an invalid name with a safe 400', async () => {
    const res = await http.post('/namespaces').send({ name: 'bad name' });
    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe('VALIDATION_ERROR');
    expect(res.body.error).not.toHaveProperty('stack');
  });

  it('POST /namespaces rejects unknown properties', async () => {
    const res = await http.post('/namespaces').send({ name: 'users', extra: true });
    expect(res.status).toBe(400);
    expect(res.body.error.details).toContain('property extra should not exist');
  });

  it('POST /namespaces returns 409 for a duplicate', async () => {
    await http.post('/namespaces').send({ name: 'users' });
    const res = await http.post('/namespaces').send({ name: 'users' });
    expect(res.status).toBe(409);
    expect(res.body.error.code).toBe('DUPLICATE_NAMESPACE');
  });

  it('GET /namespaces lists namespaces in order', async () => {
    await http.post('/namespaces').send({ name: 'zeta' });
    await http.post('/namespaces').send({ name: 'alpha' });
    const res = await http.get('/namespaces');
    expect(res.status).toBe(200);
    expect(res.body.map((n: { name: string }) => n.name)).toEqual(['alpha', 'zeta']);
  });

  it('GET /namespaces/:name returns an existing namespace', async () => {
    await http.post('/namespaces').send({ name: 'users' });
    const res = await http.get('/namespaces/users');
    expect(res.status).toBe(200);
    expect(res.body.name).toBe('users');
  });

  it('GET /namespaces/:name returns 404 for a missing namespace', async () => {
    const res = await http.get('/namespaces/missing');
    expect(res.status).toBe(404);
    expect(res.body.error.code).toBe('NAMESPACE_NOT_FOUND');
  });

  it('GET /namespaces/:name returns 400 for an invalid route parameter', async () => {
    const res = await http.get('/namespaces/bad%20name');
    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe('VALIDATION_ERROR');
  });

  it('PUT /namespaces/:name renames a namespace', async () => {
    await http.post('/namespaces').send({ name: 'users' });
    const res = await http.put('/namespaces/users').send({ name: 'people' });
    expect(res.status).toBe(200);
    expect(res.body.name).toBe('people');
  });

  it('PUT /namespaces/:name returns 409 when renaming to an existing name', async () => {
    await http.post('/namespaces').send({ name: 'users' });
    await http.post('/namespaces').send({ name: 'people' });
    const res = await http.put('/namespaces/users').send({ name: 'people' });
    expect(res.status).toBe(409);
  });

  it('DELETE /namespaces/:name deletes a namespace', async () => {
    await http.post('/namespaces').send({ name: 'users' });
    const res = await http.delete('/namespaces/users');
    expect(res.status).toBe(204);
    expect((await http.get('/namespaces/users')).status).toBe(404);
  });

  it('DELETE /namespaces/:name returns 404 for a missing namespace', async () => {
    const res = await http.delete('/namespaces/missing');
    expect(res.status).toBe(404);
  });
});

describe('Entry endpoints', () => {
  beforeEach(async () => {
    await http.post('/namespaces').send({ name: 'users' });
  });

  it('POST creates an entry', async () => {
    const res = await http.post('/namespaces/users/entries').send({ name: 'admin', value: 'secret' });
    expect(res.status).toBe(201);
    expect(res.body).toEqual({ name: 'admin', value: 'secret' });
  });

  it('POST returns 404 for a missing namespace', async () => {
    const res = await http.post('/namespaces/missing/entries').send({ name: 'admin', value: 'v' });
    expect(res.status).toBe(404);
    expect(res.body.error.code).toBe('NAMESPACE_NOT_FOUND');
  });

  it('POST returns 409 for a duplicate entry', async () => {
    await http.post('/namespaces/users/entries').send({ name: 'admin', value: 'v' });
    const res = await http.post('/namespaces/users/entries').send({ name: 'admin', value: 'v2' });
    expect(res.status).toBe(409);
    expect(res.body.error.code).toBe('DUPLICATE_ENTRY');
  });

  it('POST returns 400 for a missing value', async () => {
    const res = await http.post('/namespaces/users/entries').send({ name: 'admin' });
    expect(res.status).toBe(400);
  });

  it('GET lists entries in order', async () => {
    await http.post('/namespaces/users/entries').send({ name: 'zeta', value: '1' });
    await http.post('/namespaces/users/entries').send({ name: 'alpha', value: '2' });
    const res = await http.get('/namespaces/users/entries');
    expect(res.body.map((e: { name: string }) => e.name)).toEqual(['alpha', 'zeta']);
  });

  it('GET :name returns an entry', async () => {
    await http.post('/namespaces/users/entries').send({ name: 'admin', value: 'v' });
    const res = await http.get('/namespaces/users/entries/admin');
    expect(res.body).toEqual({ name: 'admin', value: 'v' });
  });

  it('GET :name returns 404 for a missing entry', async () => {
    const res = await http.get('/namespaces/users/entries/missing');
    expect(res.status).toBe(404);
    expect(res.body.error.code).toBe('ENTRY_NOT_FOUND');
  });

  it('PUT updates an entry value', async () => {
    await http.post('/namespaces/users/entries').send({ name: 'admin', value: 'v' });
    const res = await http.put('/namespaces/users/entries/admin').send({ value: 'updated' });
    expect(res.body).toEqual({ name: 'admin', value: 'updated' });
  });

  it('DELETE removes an entry', async () => {
    await http.post('/namespaces/users/entries').send({ name: 'admin', value: 'v' });
    const res = await http.delete('/namespaces/users/entries/admin');
    expect(res.status).toBe(204);
    expect((await http.get('/namespaces/users/entries/admin')).status).toBe(404);
  });
});

describe('YAML endpoints', () => {
  it('POST /yaml/import imports multiple namespaces', async () => {
    const yaml = `namespaces:
  - name: users
    entries:
      - name: admin
        value: secret
  - name: settings
    entries: []`;
    const res = await http.post('/yaml/import').send({ yaml });
    expect(res.status).toBe(201);
    expect(res.body.namespaces.map((n: { name: string }) => n.name)).toEqual(['users', 'settings']);
  });

  it('POST /yaml/import returns 400 for invalid YAML', async () => {
    const res = await http.post('/yaml/import').send({ yaml: 'unexpected: true' });
    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe('INVALID_YAML');
  });

  it('GET /yaml/export exports all namespaces as raw YAML', async () => {
    await http.post('/namespaces').send({ name: 'users' });
    const res = await http.get('/yaml/export');
    expect(res.status).toBe(200);
    expect(res.body.yaml).toContain('users');
    expect(res.body.yaml).not.toContain('```');
  });

  it('GET /yaml/export/:namespace exports one namespace', async () => {
    await http.post('/namespaces').send({ name: 'users' });
    await http.post('/namespaces').send({ name: 'settings' });
    const res = await http.get('/yaml/export/users');
    expect(res.body.yaml).toContain('users');
    expect(res.body.yaml).not.toContain('settings');
  });

  it('GET /yaml/export/:namespace returns 404 for a missing namespace', async () => {
    const res = await http.get('/yaml/export/missing');
    expect(res.status).toBe(404);
    expect(res.body.error.code).toBe('NAMESPACE_NOT_FOUND');
  });
});
