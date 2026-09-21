import type { EntryListQuery, NamespaceListQuery } from '@okvns/shared';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { ApiError } from './api-error';
import { toDisplayError } from './error-message';
import { HttpOkvnsApi, type FetchFn } from './okvns-api';

function json(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json' },
  });
}

function apiWith(response: Response | (() => Response | Promise<Response>)) {
  // A Response body can be read once, so hand out a fresh copy per call.
  const fetchImpl = vi.fn<FetchFn>(async () =>
    typeof response === 'function' ? response() : response.clone(),
  );
  return { api: new HttpOkvnsApi('http://api.test/', fetchImpl), fetchImpl };
}

const nsQuery: NamespaceListQuery = {
  page: 2,
  pageSize: 50,
  sort: 'modified_at',
  direction: 'desc',
};
const entryQuery: EntryListQuery = {
  page: 1,
  pageSize: 10,
  sort: 'env_dependent',
  direction: 'asc',
};

afterEach(() => vi.unstubAllGlobals());

describe('HttpOkvnsApi requests', () => {
  it('GIVEN list queries WHEN requested THEN query parameters use the API names and omit empty filters', async () => {
    const { api, fetchImpl } = apiWith(
      json({ items: [], page: 2, page_size: 50, total_items: 0, total_pages: 0 }),
    );

    await api.listNamespaces(nsQuery);
    await api.listNamespaces({ ...nsQuery, name: 'bil ing' });
    await api.listEntries('ns', { ...entryQuery, envDependent: true, name: 'db' });
    await api.listEntries('ns', { ...entryQuery, envDependent: false });
    await api.listEntries('ns', entryQuery);

    expect(fetchImpl.mock.calls.map((call) => call[0])).toEqual([
      'http://api.test/namespaces?page=2&page_size=50&sort=modified_at&direction=desc',
      'http://api.test/namespaces?page=2&page_size=50&sort=modified_at&direction=desc&name=bil+ing',
      'http://api.test/namespaces/ns/entries?page=1&page_size=10&sort=env_dependent&direction=asc&name=db&env_dependent=true',
      'http://api.test/namespaces/ns/entries?page=1&page_size=10&sort=env_dependent&direction=asc&env_dependent=false',
      'http://api.test/namespaces/ns/entries?page=1&page_size=10&sort=env_dependent&direction=asc',
    ]);
  });

  it('GIVEN names needing encoding WHEN requested THEN path segments are encoded', async () => {
    const { api, fetchImpl } = apiWith(json({}));

    await api.getNamespace('a b/ü');
    await api.updateEntry('a b', 'x/y', { value: 'v' });

    expect(fetchImpl.mock.calls.map((call) => call[0])).toEqual([
      'http://api.test/namespaces/a%20b%2F%C3%BC',
      'http://api.test/namespaces/a%20b/entries/x%2Fy',
    ]);
  });

  it('GIVEN write calls WHEN sent THEN they use the documented verbs and JSON bodies', async () => {
    const { api, fetchImpl } = apiWith(json({}));

    await api.createNamespace({ name: 'n', description: 'd' });
    await api.updateNamespace('n', { description: '' });
    await api.createEntry('n', { name: 'k', value: 'v', env_dependent: true });
    await api.updateEntry('n', 'k', { name: 'k2' });

    const summary = fetchImpl.mock.calls.map((call) => {
      const init = call[1]!;
      return [init.method, init.body, (init.headers as Record<string, string>)['Content-Type']];
    });
    expect(summary).toEqual([
      ['POST', '{"name":"n","description":"d"}', 'application/json'],
      ['PUT', '{"description":""}', 'application/json'],
      ['POST', '{"name":"k","value":"v","env_dependent":true}', 'application/json'],
      ['PUT', '{"name":"k2"}', 'application/json'],
    ]);
  });

  it('GIVEN deletes WHEN answered with 204 THEN they resolve without reading a body', async () => {
    const { api, fetchImpl } = apiWith(new Response(null, { status: 204 }));

    await expect(api.deleteNamespace('n')).resolves.toBeUndefined();
    await expect(api.deleteEntry('n', 'k')).resolves.toBeUndefined();

    expect(fetchImpl.mock.calls.map((call) => [call[0], call[1]?.method])).toEqual([
      ['http://api.test/namespaces/n', 'DELETE'],
      ['http://api.test/namespaces/n/entries/k', 'DELETE'],
    ]);
  });

  it('GIVEN pasted YAML WHEN imported THEN it is sent in the JSON yaml field', async () => {
    const { api, fetchImpl } = apiWith(json({ namespaces: [{ name: 'a', entries: [] }] }, 201));

    const result = await api.importYaml('namespaces: []');

    const init = fetchImpl.mock.calls[0]![1]!;
    expect(fetchImpl.mock.calls[0]![0]).toBe('http://api.test/yaml/import');
    expect(init.body).toBe('{"yaml":"namespaces: []"}');
    expect((init.headers as Record<string, string>)['Content-Type']).toBe('application/json');
    expect(result).toEqual([{ name: 'a', entries: [] }]);
  });

  it('GIVEN an uploaded file WHEN imported THEN it is sent as multipart field "file" without a Content-Type', async () => {
    const { api, fetchImpl } = apiWith(json({ namespaces: [] }, 201));
    const file = new File(['namespaces: []'], 'import.yaml', { type: 'application/x-yaml' });

    await api.importYamlFile(file);

    const init = fetchImpl.mock.calls[0]![1]!;
    expect(init.method).toBe('POST');
    expect(init.headers).toBeUndefined();
    const body = init.body as FormData;
    expect(body).toBeInstanceOf(FormData);
    expect([...body.keys()]).toEqual(['file']);
    expect((body.get('file') as File).name).toBe('import.yaml');
  });

  it('GIVEN exports WHEN requested THEN the yaml field is returned', async () => {
    const { api, fetchImpl } = apiWith(json({ yaml: 'namespaces: []\n' }));

    expect(await api.exportAll()).toBe('namespaces: []\n');
    expect(await api.exportNamespace('a b')).toBe('namespaces: []\n');
    expect(fetchImpl.mock.calls.map((call) => call[0])).toEqual([
      'http://api.test/yaml/export',
      'http://api.test/yaml/export/a%20b',
    ]);
  });
});

describe('HttpOkvnsApi response mapping', () => {
  it('GIVEN namespace, entry and page responses WHEN received THEN fields are exposed unchanged', async () => {
    const entry = {
      name: 'k',
      value: 'v',
      description: 'd',
      env_dependent: true,
      created_at: '2026-09-21T10:00:00.000Z',
      modified_at: '2026-09-22T10:00:00.000Z',
    };
    const item = {
      name: 'n',
      description: 'about',
      created_at: entry.created_at,
      modified_at: entry.modified_at,
    };
    const page = { items: [item], page: 3, page_size: 50, total_items: 120, total_pages: 3 };
    const namespace = { ...item, entries: [entry] };

    expect(await apiWith(json(page)).api.listNamespaces(nsQuery)).toEqual(page);
    expect(
      await apiWith(json({ ...page, items: [entry] })).api.listEntries('n', entryQuery),
    ).toEqual({
      ...page,
      items: [entry],
    });
    expect(await apiWith(json(namespace)).api.getNamespace('n')).toEqual(namespace);
    expect(await apiWith(json(entry, 201)).api.createEntry('n', { name: 'k', value: 'v' })).toEqual(
      entry,
    );
  });

  it('GIVEN a safe error response WHEN received THEN it maps to an ApiError with code, message and details', async () => {
    const { api } = apiWith(
      json(
        {
          error: {
            code: 'VALIDATION_ERROR',
            message: 'Request validation failed.',
            details: ['name must be a string'],
          },
        },
        400,
      ),
    );

    const error = await api.createNamespace({ name: '' }).catch((e) => e);

    expect(error).toBeInstanceOf(ApiError);
    expect(error).toMatchObject({
      status: 400,
      code: 'VALIDATION_ERROR',
      message: 'Request validation failed.',
      details: ['name must be a string'],
    });
  });

  it('GIVEN an error without details WHEN received THEN details default to an empty list', async () => {
    const error = await apiWith(
      json({ error: { code: 'NAMESPACE_NOT_FOUND', message: 'nope' } }, 404),
    )
      .api.getNamespace('x')
      .catch((e) => e);

    expect(error.details).toEqual([]);
  });

  it.each([
    ['a non-JSON body', () => new Response('<html>Bad gateway</html>', { status: 502 })],
    ['a JSON body of another shape', () => json({ message: 'boom' }, 500)],
    ['an error with the wrong field types', () => json({ error: { code: 1, message: 2 } }, 500)],
  ])(
    'GIVEN %s WHEN received THEN a generic error carries only the status',
    async (_label, response) => {
      const error = await apiWith(response)
        .api.getNamespace('x')
        .catch((e) => e);

      expect(error).toBeInstanceOf(ApiError);
      expect(error).toMatchObject({ status: expect.any(Number), code: 'INVALID_RESPONSE' });
      expect(error.message).toMatch(/^The OKVNS API returned an unexpected error \(HTTP \d+\)\.$/);
      expect(error.message).not.toContain('html');
    },
  );

  it('GIVEN an unreadable success body WHEN received THEN an invalid-response error is thrown', async () => {
    const error = await apiWith(new Response('not json', { status: 200 }))
      .api.getNamespace('x')
      .catch((e) => e);

    expect(error).toMatchObject({ status: 200, code: 'INVALID_RESPONSE' });
  });

  it('GIVEN a failing fetch WHEN requested THEN a network error without transport internals is thrown', async () => {
    const api = new HttpOkvnsApi('http://api.test', async () => {
      throw new TypeError('Failed to fetch: net::ERR_CONNECTION_REFUSED');
    });

    const error = await api.getNamespace('x').catch((e) => e);

    expect(error).toMatchObject({ status: 0, code: 'NETWORK_ERROR' });
    expect(error.message).not.toContain('ERR_CONNECTION_REFUSED');
  });
});

describe('default fetch', () => {
  it('GIVEN no injected fetch WHEN requested THEN the global fetch runs with the global this (no Illegal invocation)', async () => {
    const seen: unknown[] = [];
    vi.stubGlobal('fetch', function (this: unknown) {
      seen.push(this);
      if (this !== globalThis && this !== undefined) {
        throw new TypeError('Illegal invocation');
      }
      return Promise.resolve(json({ name: 'n', entries: [] }));
    });

    const namespace = await new HttpOkvnsApi('http://api.test').getNamespace('n');

    expect(namespace.name).toBe('n');
    expect(seen).toHaveLength(1);
  });
});

describe('toDisplayError', () => {
  it('GIVEN an API error WHEN displayed THEN message and details are shown', () => {
    expect(toDisplayError(new ApiError(409, 'DUPLICATE_NAMESPACE', 'Exists.', ['x']))).toEqual({
      title: 'Request failed',
      message: 'Exists.',
      details: ['x'],
    });
  });

  it('GIVEN a network error WHEN displayed THEN it is a connection problem', () => {
    expect(toDisplayError(new ApiError(0, 'NETWORK_ERROR', 'down')).title).toBe(
      'Connection problem',
    );
  });

  it('GIVEN any other failure WHEN displayed THEN nothing internal is exposed', () => {
    const shown = toDisplayError(new Error('secret stack at /srv/app.js'));

    expect(shown.message).toBe('An unexpected error occurred.');
    expect(JSON.stringify(shown)).not.toContain('secret');
  });
});
