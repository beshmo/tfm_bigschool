import { describe, expect, it, vi } from 'vitest';
import { ApiError } from './api-error';
import { HttpOkvnsApi, toApiError } from './okvns-api';

function jsonResponse(body: unknown, status = 200): Response {
  return new Response(body === undefined ? '' : JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json' },
  });
}

describe('HttpOkvnsApi', () => {
  it('GET listNamespaces maps a successful response body', async () => {
    const fetchImpl = vi.fn(async () => jsonResponse([{ name: 'users', entries: [] }]));
    const api = new HttpOkvnsApi('http://api.test', fetchImpl);
    expect(await api.listNamespaces()).toEqual([{ name: 'users', entries: [] }]);
    expect(fetchImpl).toHaveBeenCalledWith('http://api.test/namespaces', undefined);
  });

  it('POST createNamespace sends a JSON body', async () => {
    const fetchImpl = vi.fn(async () => jsonResponse({ name: 'users', entries: [] }, 201));
    const api = new HttpOkvnsApi('http://api.test', fetchImpl);
    await api.createNamespace('users');
    expect(fetchImpl).toHaveBeenCalledWith(
      'http://api.test/namespaces',
      expect.objectContaining({ method: 'POST', body: JSON.stringify({ name: 'users' }) }),
    );
  });

  it('maps a safe error body into an ApiError with code and status', async () => {
    const fetchImpl = vi.fn(async () =>
      jsonResponse({ error: { code: 'DUPLICATE_NAMESPACE', message: 'exists' } }, 409),
    );
    const api = new HttpOkvnsApi('http://api.test', fetchImpl);
    await expect(api.createNamespace('users')).rejects.toMatchObject({
      code: 'DUPLICATE_NAMESPACE',
      status: 409,
    });
  });

  it('returns undefined for a 204 response', async () => {
    const fetchImpl = vi.fn(async () => new Response(null, { status: 204 }));
    const api = new HttpOkvnsApi('http://api.test', fetchImpl);
    await expect(api.deleteNamespace('users')).resolves.toBeUndefined();
  });

  it('maps a network failure into a NETWORK_ERROR ApiError', async () => {
    const fetchImpl = vi.fn(async () => {
      throw new Error('offline');
    });
    const api = new HttpOkvnsApi('http://api.test', fetchImpl);
    await expect(api.listNamespaces()).rejects.toMatchObject({ code: 'NETWORK_ERROR' });
  });

  it('unwraps importYaml and export responses', async () => {
    const fetchImpl = vi
      .fn()
      .mockResolvedValueOnce(jsonResponse({ namespaces: [{ name: 'a', entries: [] }] }, 201))
      .mockResolvedValueOnce(jsonResponse({ yaml: 'namespaces: []' }))
      .mockResolvedValueOnce(jsonResponse({ yaml: 'namespace: a' }));
    const api = new HttpOkvnsApi('http://api.test', fetchImpl);
    expect(await api.importYaml('namespaces: []')).toEqual([{ name: 'a', entries: [] }]);
    expect(await api.exportAll()).toBe('namespaces: []');
    expect(await api.exportNamespace('a')).toBe('namespace: a');
  });
});

describe('toApiError', () => {
  it('falls back to UNKNOWN for a malformed error body', () => {
    const error = toApiError('not-json', 500);
    expect(error).toBeInstanceOf(ApiError);
    expect(error.code).toBe('UNKNOWN');
    expect(error.status).toBe(500);
  });
});
