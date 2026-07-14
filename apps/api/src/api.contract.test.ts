import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import type { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { REQUEST_BODY_MAX_BYTES } from '@okvns/shared';
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
  it('POST /namespaces creates a namespace with timestamps', async () => {
    const res = await http.post('/namespaces').send({ name: 'users' });
    expect(res.status).toBe(201);
    expect(res.body).toMatchObject({ name: 'users', entries: [] });
    expect(res.body.created_at).toEqual(expect.any(String));
    expect(res.body.modified_at).toEqual(expect.any(String));
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

  it('GET /namespaces lists namespaces in order with timestamps', async () => {
    await http.post('/namespaces').send({ name: 'zeta' });
    await http.post('/namespaces').send({ name: 'alpha' });
    const res = await http.get('/namespaces');
    expect(res.status).toBe(200);
    expect(res.body.map((n: { name: string }) => n.name)).toEqual(['alpha', 'zeta']);
    for (const namespace of res.body) {
      expect(namespace.created_at).toEqual(expect.any(String));
      expect(namespace.modified_at).toEqual(expect.any(String));
    }
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

  it('PUT /namespaces/:name renames a namespace preserving created_at', async () => {
    const created = await http.post('/namespaces').send({ name: 'users' });
    const res = await http.put('/namespaces/users').send({ name: 'people' });
    expect(res.status).toBe(200);
    expect(res.body.name).toBe('people');
    expect(res.body.created_at).toBe(created.body.created_at);
    expect(res.body.modified_at).toEqual(expect.any(String));
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

  it('POST /namespaces stores an optional description', async () => {
    const res = await http.post('/namespaces').send({ name: 'users', description: 'the users' });
    expect(res.status).toBe(201);
    expect(res.body.description).toBe('the users');
    expect((await http.get('/namespaces/users')).body.description).toBe('the users');
  });

  it('POST /namespaces omits a blank description', async () => {
    const res = await http.post('/namespaces').send({ name: 'users', description: '   ' });
    expect(res.status).toBe(201);
    expect(res.body).not.toHaveProperty('description');
  });

  it('POST /namespaces rejects a non-string description with a safe 400', async () => {
    const res = await http.post('/namespaces').send({ name: 'users', description: 42 });
    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe('VALIDATION_ERROR');
    expect(res.body.error).not.toHaveProperty('stack');
  });

  it('POST /namespaces rejects an oversized description with a safe 400', async () => {
    const res = await http
      .post('/namespaces')
      .send({ name: 'users', description: 'x'.repeat(1001) });
    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe('VALIDATION_ERROR');
  });

  it('GET /namespaces includes descriptions when stored', async () => {
    await http.post('/namespaces').send({ name: 'users', description: 'the users' });
    const res = await http.get('/namespaces');
    expect(res.body[0].description).toBe('the users');
  });

  it('PUT /namespaces/:name updates the description and refreshes modified_at', async () => {
    const created = await http.post('/namespaces').send({ name: 'users', description: 'old' });
    const res = await http.put('/namespaces/users').send({ description: 'new' });
    expect(res.status).toBe(200);
    expect(res.body).toMatchObject({ name: 'users', description: 'new' });
    expect(res.body.created_at).toBe(created.body.created_at);
    expect(res.body.modified_at >= created.body.modified_at).toBe(true);
    expect((await http.get('/namespaces/users')).body.description).toBe('new');
  });

  it('PUT /namespaces/:name clears the description with a blank value', async () => {
    await http.post('/namespaces').send({ name: 'users', description: 'old' });
    const res = await http.put('/namespaces/users').send({ description: '  ' });
    expect(res.status).toBe(200);
    expect(res.body).not.toHaveProperty('description');
  });

  it('PUT /namespaces/:name renames while preserving the description', async () => {
    await http.post('/namespaces').send({ name: 'users', description: 'the users' });
    const res = await http.put('/namespaces/users').send({ name: 'people' });
    expect(res.status).toBe(200);
    expect(res.body).toMatchObject({ name: 'people', description: 'the users' });
  });

  it('PUT /namespaces/:name rejects an empty update body', async () => {
    await http.post('/namespaces').send({ name: 'users' });
    const res = await http.put('/namespaces/users').send({});
    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe('VALIDATION_ERROR');
  });

  it('PUT /namespaces/:name rejects an oversized description', async () => {
    await http.post('/namespaces').send({ name: 'users' });
    const res = await http.put('/namespaces/users').send({ description: 'x'.repeat(1001) });
    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe('VALIDATION_ERROR');
  });
});

describe('Entry endpoints', () => {
  beforeEach(async () => {
    await http.post('/namespaces').send({ name: 'users' });
  });

  it('POST creates an entry with timestamps', async () => {
    const res = await http
      .post('/namespaces/users/entries')
      .send({ name: 'admin', value: 'secret' });
    expect(res.status).toBe(201);
    expect(res.body).toMatchObject({ name: 'admin', value: 'secret' });
    expect(res.body.created_at).toEqual(expect.any(String));
    expect(res.body.modified_at).toEqual(expect.any(String));
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

  it('GET lists entries in order with timestamps', async () => {
    await http.post('/namespaces/users/entries').send({ name: 'zeta', value: '1' });
    await http.post('/namespaces/users/entries').send({ name: 'alpha', value: '2' });
    const res = await http.get('/namespaces/users/entries');
    expect(res.body.map((e: { name: string }) => e.name)).toEqual(['alpha', 'zeta']);
    for (const entry of res.body) {
      expect(entry.created_at).toEqual(expect.any(String));
      expect(entry.modified_at).toEqual(expect.any(String));
    }
  });

  it('GET :name returns an entry with timestamps', async () => {
    await http.post('/namespaces/users/entries').send({ name: 'admin', value: 'v' });
    const res = await http.get('/namespaces/users/entries/admin');
    expect(res.body).toMatchObject({ name: 'admin', value: 'v' });
    expect(res.body.created_at).toEqual(expect.any(String));
    expect(res.body.modified_at).toEqual(expect.any(String));
  });

  it('GET :name returns 404 for a missing entry', async () => {
    const res = await http.get('/namespaces/users/entries/missing');
    expect(res.status).toBe(404);
    expect(res.body.error.code).toBe('ENTRY_NOT_FOUND');
  });

  it('PUT updates an entry value preserving created_at', async () => {
    const created = await http
      .post('/namespaces/users/entries')
      .send({ name: 'admin', value: 'v' });
    const res = await http.put('/namespaces/users/entries/admin').send({ value: 'updated' });
    expect(res.body).toMatchObject({ name: 'admin', value: 'updated' });
    expect(res.body.created_at).toBe(created.body.created_at);
    expect(res.body.modified_at).toEqual(expect.any(String));
  });

  it('PUT renames an entry preserving created_at', async () => {
    const created = await http
      .post('/namespaces/users/entries')
      .send({ name: 'admin', value: 'v' });
    const res = await http.put('/namespaces/users/entries/admin').send({ name: 'root' });
    expect(res.status).toBe(200);
    expect(res.body).toMatchObject({ name: 'root', value: 'v' });
    expect(res.body.created_at).toBe(created.body.created_at);
    // The renamed entry is retrievable under its new name with the same created_at.
    const fetched = await http.get('/namespaces/users/entries/root');
    expect(fetched.body.created_at).toBe(created.body.created_at);
    expect((await http.get('/namespaces/users/entries/admin')).status).toBe(404);
  });

  it('DELETE removes an entry', async () => {
    await http.post('/namespaces/users/entries').send({ name: 'admin', value: 'v' });
    const res = await http.delete('/namespaces/users/entries/admin');
    expect(res.status).toBe(204);
    expect((await http.get('/namespaces/users/entries/admin')).status).toBe(404);
  });

  it('POST stores an optional entry description', async () => {
    const res = await http
      .post('/namespaces/users/entries')
      .send({ name: 'admin', value: 'v', description: 'the admin key' });
    expect(res.status).toBe(201);
    expect(res.body.description).toBe('the admin key');
    expect((await http.get('/namespaces/users/entries/admin')).body.description).toBe(
      'the admin key',
    );
  });

  it('POST omits a blank entry description', async () => {
    const res = await http
      .post('/namespaces/users/entries')
      .send({ name: 'admin', value: 'v', description: '   ' });
    expect(res.status).toBe(201);
    expect(res.body).not.toHaveProperty('description');
  });

  it('POST rejects a non-string entry description with a safe 400', async () => {
    const res = await http
      .post('/namespaces/users/entries')
      .send({ name: 'admin', value: 'v', description: 42 });
    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe('VALIDATION_ERROR');
    expect(res.body.error).not.toHaveProperty('stack');
  });

  it('POST rejects an oversized entry description with a safe 400', async () => {
    const res = await http
      .post('/namespaces/users/entries')
      .send({ name: 'admin', value: 'v', description: 'x'.repeat(1001) });
    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe('VALIDATION_ERROR');
  });

  it('GET lists entries with descriptions when stored', async () => {
    await http
      .post('/namespaces/users/entries')
      .send({ name: 'admin', value: 'v', description: 'docs' });
    const res = await http.get('/namespaces/users/entries');
    expect(res.body[0].description).toBe('docs');
  });

  it('PUT updates only the description preserving name, value, and created_at', async () => {
    const created = await http
      .post('/namespaces/users/entries')
      .send({ name: 'admin', value: 'v', description: 'old' });
    const res = await http.put('/namespaces/users/entries/admin').send({ description: 'new' });
    expect(res.status).toBe(200);
    expect(res.body).toMatchObject({ name: 'admin', value: 'v', description: 'new' });
    expect(res.body.created_at).toBe(created.body.created_at);
    expect(res.body.modified_at >= created.body.modified_at).toBe(true);
  });

  it('PUT preserves the description when updating only the value', async () => {
    await http
      .post('/namespaces/users/entries')
      .send({ name: 'admin', value: 'v', description: 'docs' });
    const res = await http.put('/namespaces/users/entries/admin').send({ value: 'v2' });
    expect(res.body).toMatchObject({ value: 'v2', description: 'docs' });
  });

  it('PUT clears the entry description with a blank value', async () => {
    await http
      .post('/namespaces/users/entries')
      .send({ name: 'admin', value: 'v', description: 'docs' });
    const res = await http.put('/namespaces/users/entries/admin').send({ description: '  ' });
    expect(res.status).toBe(200);
    expect(res.body).not.toHaveProperty('description');
  });

  it('PUT refreshes the namespace modified_at when an entry description changes', async () => {
    await http
      .post('/namespaces/users/entries')
      .send({ name: 'admin', value: 'v', description: 'old' });
    const before = await http.get('/namespaces/users');
    await http.put('/namespaces/users/entries/admin').send({ description: 'new' });
    const after = await http.get('/namespaces/users');
    expect(after.body.modified_at >= before.body.modified_at).toBe(true);
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

  it('POST /yaml/import imports YAML from a multipart file field', async () => {
    const yaml = `namespaces:
  - name: users
    entries:
      - name: admin
        value: secret
  - name: settings
    entries: []`;
    const res = await http.post('/yaml/import').attach('file', Buffer.from(yaml, 'utf8'), {
      filename: 'import.yaml',
      contentType: 'application/x-yaml',
    });
    expect(res.status).toBe(201);
    expect(res.body.namespaces.map((n: { name: string }) => n.name)).toEqual(['users', 'settings']);
  });

  it('POST /yaml/import rejects a multipart request without the file field', async () => {
    const res = await http.post('/yaml/import').field('description', 'no file here');
    expect(res.status).toBe(400);
    expect(res.body.error).not.toHaveProperty('stack');
    expect((await http.get('/namespaces')).body).toEqual([]);
  });

  it('POST /yaml/import returns 400 for an empty multipart file', async () => {
    const res = await http.post('/yaml/import').attach('file', Buffer.from('', 'utf8'), {
      filename: 'empty.yaml',
      contentType: 'application/x-yaml',
    });
    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe('INVALID_YAML');
    expect((await http.get('/namespaces')).body).toEqual([]);
  });

  it('POST /yaml/import rejects an oversized multipart file with a safe error', async () => {
    const oversized = Buffer.alloc(REQUEST_BODY_MAX_BYTES + 1024, 0x61);
    const res = await http
      .post('/yaml/import')
      .attach('file', oversized, { filename: 'big.yaml', contentType: 'application/x-yaml' });
    expect(res.status).toBe(413);
    expect(res.body.error.code).toBe('VALIDATION_ERROR');
    expect(res.body.error).not.toHaveProperty('stack');
    expect((await http.get('/namespaces')).body).toEqual([]);
  });

  it('POST /yaml/import returns 400 for invalid uploaded YAML', async () => {
    const res = await http
      .post('/yaml/import')
      .attach('file', Buffer.from('unexpected: true', 'utf8'), {
        filename: 'bad.yaml',
        contentType: 'application/x-yaml',
      });
    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe('INVALID_YAML');
    expect((await http.get('/namespaces')).body).toEqual([]);
  });

  it('POST /yaml/import accepts but ignores supplied timestamp metadata', async () => {
    const yaml = `namespaces:
  - name: users
    created_at: "2000-01-01T00:00:00.000Z"
    modified_at: "2000-01-01T00:00:00.000Z"
    entries:
      - name: admin
        value: secret
        created_at: "2000-01-01T00:00:00.000Z"
        modified_at: "2000-01-01T00:00:00.000Z"`;
    const res = await http.post('/yaml/import').send({ yaml });
    expect(res.status).toBe(201);
    const [namespace] = res.body.namespaces;
    expect(namespace.name).toBe('users');
    // Timestamps are assigned by the store, not copied from the document.
    expect(namespace.created_at).not.toBe('2000-01-01T00:00:00.000Z');
    expect(namespace.entries[0].created_at).not.toBe('2000-01-01T00:00:00.000Z');
  });

  it('GET /yaml/export exports all namespaces as raw YAML with timestamp metadata', async () => {
    await http.post('/namespaces').send({ name: 'users' });
    const res = await http.get('/yaml/export');
    expect(res.status).toBe(200);
    expect(res.body.yaml).toContain('users');
    expect(res.body.yaml).toContain('created_at');
    expect(res.body.yaml).toContain('modified_at');
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

  it('POST /yaml/import imports namespace and entry descriptions', async () => {
    const yaml = `namespaces:
  - name: users
    description: the users
    entries:
      - name: admin
        value: secret
        description: the admin key`;
    const res = await http.post('/yaml/import').send({ yaml });
    expect(res.status).toBe(201);
    expect(res.body.namespaces[0].description).toBe('the users');
    expect(res.body.namespaces[0].entries[0].description).toBe('the admin key');
    expect((await http.get('/namespaces/users')).body.description).toBe('the users');
  });

  it('POST /yaml/import returns 400 for an oversized description', async () => {
    const yaml = `namespaces:
  - name: users
    description: "${'x'.repeat(1001)}"
    entries: []`;
    const res = await http.post('/yaml/import').send({ yaml });
    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe('INVALID_YAML');
    expect((await http.get('/namespaces/users')).status).toBe(404);
  });

  it('GET /yaml/export includes descriptions only when stored', async () => {
    await http.post('/namespaces').send({ name: 'users', description: 'the users' });
    await http
      .post('/namespaces/users/entries')
      .send({ name: 'admin', value: 'v', description: 'the admin key' });
    await http.post('/namespaces').send({ name: 'plain' });

    const res = await http.get('/yaml/export');
    expect(res.body.yaml).toContain('description: the users');
    expect(res.body.yaml).toContain('description: the admin key');

    const plain = await http.get('/yaml/export/plain');
    expect(plain.body.yaml).not.toContain('description');
  });
});

describe('OpenAPI document', () => {
  it('GET /docs-json returns a valid OpenAPI document', async () => {
    const res = await http.get('/docs-json');
    expect(res.status).toBe(200);
    expect(res.body.openapi).toMatch(/^3\./);
    expect(res.body.info.title).toBe('OKVNS API');
    expect(res.body.paths).toBeTypeOf('object');
  });

  it('documents the health, readiness, namespace, entry, and YAML paths', async () => {
    const { body } = await http.get('/docs-json');
    const paths = Object.keys(body.paths);
    expect(paths).toContain('/health');
    expect(paths).toContain('/ready');
    expect(paths).toContain('/namespaces');
    expect(paths).toContain('/namespaces/{name}');
    expect(paths).toContain('/namespaces/{namespace}/entries');
    expect(paths).toContain('/namespaces/{namespace}/entries/{name}');
    expect(paths).toContain('/yaml/import');
    expect(paths).toContain('/yaml/export');
    expect(paths).toContain('/yaml/export/{namespace}');
  });

  it('documents request, response, multipart upload, and safe error schemas', async () => {
    const { body } = await http.get('/docs-json');
    const schemas = body.components.schemas;

    // Request and response schemas.
    expect(schemas).toHaveProperty('NamespaceInputDto');
    expect(schemas).toHaveProperty('NamespaceResponse');
    expect(schemas).toHaveProperty('CreateEntryDto');
    expect(schemas).toHaveProperty('EntryResponse');
    expect(schemas).toHaveProperty('YamlImportResponse');
    expect(schemas).toHaveProperty('YamlExportResponse');

    // Safe error shape (no stack traces).
    expect(schemas).toHaveProperty('ApiErrorResponse');
    expect(schemas.ApiErrorBody.properties).toHaveProperty('code');
    expect(schemas.ApiErrorBody.properties).not.toHaveProperty('stack');
    const notFound = body.paths['/namespaces/{name}'].get.responses['404'];
    expect(notFound.content['application/json'].schema.$ref).toContain('ApiErrorResponse');

    // Multipart file upload on YAML import.
    const importOp = body.paths['/yaml/import'].post;
    expect(Object.keys(importOp.requestBody.content)).toContain('multipart/form-data');
    expect(schemas.YamlImportFileDto.properties.file.format).toBe('binary');
  });

  it('documents timestamp fields on namespace, entry, and YAML schemas', async () => {
    const { body } = await http.get('/docs-json');
    const schemas = body.components.schemas;

    for (const field of ['created_at', 'modified_at']) {
      expect(schemas.NamespaceResponse.properties[field]).toBeDefined();
      expect(schemas.NamespaceResponse.properties[field].format).toBe('date-time');
      expect(schemas.EntryResponse.properties[field]).toBeDefined();
      expect(schemas.EntryResponse.properties[field].format).toBe('date-time');
    }

    // The YAML import response is documented in terms of namespace schemas,
    // so timestamp metadata is carried transitively.
    expect(schemas.YamlImportResponse.properties.namespaces.items.$ref).toContain(
      'NamespaceResponse',
    );
  });

  it('documents optional description fields with the 1000-character limit', async () => {
    const { body } = await http.get('/docs-json');
    const schemas = body.components.schemas;

    // Response schemas expose an optional description.
    for (const schema of ['NamespaceResponse', 'EntryResponse']) {
      expect(schemas[schema].properties.description.type).toBe('string');
      expect(schemas[schema].properties.description.maxLength).toBe(1000);
      expect(schemas[schema].required ?? []).not.toContain('description');
    }

    // Request schemas accept an optional description on create and update.
    for (const schema of [
      'NamespaceInputDto',
      'UpdateNamespaceDto',
      'CreateEntryDto',
      'UpdateEntryDto',
    ]) {
      expect(schemas[schema].properties.description.type).toBe('string');
      expect(schemas[schema].properties.description.maxLength).toBe(1000);
      expect(schemas[schema].required ?? []).not.toContain('description');
    }

    // The YAML import response carries descriptions transitively via
    // NamespaceResponse, asserted above.
    expect(schemas.YamlImportResponse.properties.namespaces.items.$ref).toContain(
      'NamespaceResponse',
    );
  });
});
