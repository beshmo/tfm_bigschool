import { afterEach, describe, expect, it, vi } from 'vitest';
import * as api from './index.js';
import {
  OkvnsConfigurationError,
  OkvnsInvalidResponseError,
  OkvnsNetworkError,
  OkvnsServerError,
  OkvnsUnexpectedResponseError,
  OkvnsValidationError,
  OkvnsWrapper,
  OkvnsWrapperError,
  type FetchLike,
  type FetchLikeResponse,
} from './index.js';

function respond(status: number, body: unknown): FetchLikeResponse {
  return { ok: status >= 200 && status < 300, status, json: async () => body };
}

function stub(response: FetchLikeResponse | Error): ReturnType<typeof vi.fn> & FetchLike {
  return vi.fn(async () => {
    if (response instanceof Error) throw response;
    return response;
  }) as ReturnType<typeof vi.fn> & FetchLike;
}

const notFound = (code: string) => respond(404, { error: { code, message: 'x' } });

afterEach(() => {
  vi.unstubAllGlobals();
});

describe('OkvnsWrapper.read — success', () => {
  it('GIVEN an existing entry WHEN read THEN the value is returned from the entry endpoint', async () => {
    const fetch = stub(respond(200, { name: 'k', value: 'hello', env_dependent: false }));
    const wrapper = new OkvnsWrapper({ baseUrl: 'http://api.test', fetch });

    await expect(wrapper.read('ns', 'k', 'fallback')).resolves.toBe('hello');
    expect(fetch).toHaveBeenCalledWith('http://api.test/namespaces/ns/entries/k', {
      method: 'GET',
      headers: { Accept: 'application/json' },
    });
  });

  it('GIVEN an empty string value WHEN read THEN it is returned, not the default', async () => {
    const wrapper = new OkvnsWrapper({
      baseUrl: 'http://a',
      fetch: stub(respond(200, { value: '' })),
    });

    await expect(wrapper.read('ns', 'k', 'fallback')).resolves.toBe('');
  });

  it('GIVEN names needing encoding WHEN read THEN each path segment is encoded', async () => {
    const fetch = stub(respond(200, { value: 'v' }));

    await new OkvnsWrapper({ baseUrl: 'http://a', fetch }).read('a b/c', 'é?#', 'd');

    expect(fetch.mock.calls[0]?.[0]).toBe('http://a/namespaces/a%20b%2Fc/entries/%C3%A9%3F%23');
  });

  it('GIVEN trailing slashes on the base URL WHEN read THEN they are normalized', async () => {
    const fetch = stub(respond(200, { value: 'v' }));

    await new OkvnsWrapper({ baseUrl: 'http://a///', fetch }).read('n', 'k', 'd');

    expect(fetch.mock.calls[0]?.[0]).toBe('http://a/namespaces/n/entries/k');
  });
});

describe('OkvnsWrapper.read — missing values', () => {
  it.each(['NAMESPACE_NOT_FOUND', 'ENTRY_NOT_FOUND'])(
    'GIVEN a %s response WHEN read THEN the caller default is returned',
    async (code) => {
      const wrapper = new OkvnsWrapper({ baseUrl: 'http://a', fetch: stub(notFound(code)) });

      await expect(wrapper.read('n', 'k', 'fallback')).resolves.toBe('fallback');
    },
  );
});

describe('OkvnsWrapper.read — failures', () => {
  it('GIVEN a fetch failure WHEN read THEN a network error carries the cause', async () => {
    const cause = new TypeError('connection refused');
    const wrapper = new OkvnsWrapper({ baseUrl: 'http://a', fetch: stub(cause) });

    const error = await wrapper.read('n', 'k', 'd').catch((e) => e);

    expect(error).toBeInstanceOf(OkvnsNetworkError);
    expect(error.kind).toBe('network');
    expect(error.cause).toBe(cause);
  });

  it('GIVEN a validation response WHEN read THEN a validation error is thrown, not the default', async () => {
    const wrapper = new OkvnsWrapper({
      baseUrl: 'http://a',
      fetch: stub(respond(400, { error: { code: 'VALIDATION_ERROR', message: 'bad' } })),
    });

    const error = await wrapper.read('n', 'k', 'd').catch((e) => e);

    expect(error).toBeInstanceOf(OkvnsValidationError);
    expect(error.kind).toBe('validation');
    expect(error.message).toContain('VALIDATION_ERROR');
  });

  it('GIVEN a 400 without a parsable body WHEN read THEN it is still a validation error', async () => {
    const response: FetchLikeResponse = {
      ok: false,
      status: 400,
      json: async () => {
        throw new SyntaxError('bad json');
      },
    };

    await expect(
      new OkvnsWrapper({ baseUrl: 'http://a', fetch: stub(response) }).read('n', 'k', 'd'),
    ).rejects.toBeInstanceOf(OkvnsValidationError);
  });

  it('GIVEN a server failure WHEN read THEN a server error carries the status', async () => {
    const wrapper = new OkvnsWrapper({
      baseUrl: 'http://a',
      fetch: stub(respond(503, { error: { code: 'INTERNAL_ERROR', message: 'down' } })),
    });

    const error = await wrapper.read('n', 'k', 'd').catch((e) => e);

    expect(error).toBeInstanceOf(OkvnsServerError);
    expect(error.status).toBe(503);
    expect(error.kind).toBe('server');
  });

  it.each([
    ['a missing value', { name: 'k' }],
    ['a non-string value', { value: 5 }],
    ['a non-object body', 'text'],
    ['no body', undefined],
    ['a null body', null],
  ])(
    'GIVEN a success response with %s WHEN read THEN an invalid-response error is thrown',
    async (_l, body) => {
      const wrapper = new OkvnsWrapper({ baseUrl: 'http://a', fetch: stub(respond(200, body)) });

      const error = await wrapper.read('n', 'k', 'd').catch((e) => e);

      expect(error).toBeInstanceOf(OkvnsInvalidResponseError);
      expect(error.kind).toBe('invalid-response');
    },
  );

  it.each([
    ['an unknown route 404', respond(404, { error: { code: 'VALIDATION_ERROR', message: 'x' } })],
    ['a 404 without an error body', respond(404, {})],
    ['a 404 with a non-object error', respond(404, { error: 'nope' })],
    ['a 404 with a non-string code', respond(404, { error: { code: 5 } })],
    ['a redirect', respond(302, undefined)],
    ['a conflict', respond(409, { error: { code: 'DUPLICATE_ENTRY', message: 'x' } })],
  ])(
    'GIVEN %s WHEN read THEN an unexpected-response error carries the status',
    async (_l, response) => {
      const wrapper = new OkvnsWrapper({ baseUrl: 'http://a', fetch: stub(response) });

      const error = await wrapper.read('n', 'k', 'd').catch((e) => e);

      expect(error).toBeInstanceOf(OkvnsUnexpectedResponseError);
      expect(error.status).toBe(response.status);
      expect(error.kind).toBe('unexpected-response');
    },
  );
});

describe('OkvnsWrapper configuration', () => {
  it.each(['', '   ', undefined])(
    'GIVEN the base URL %j WHEN constructed THEN it is rejected',
    (baseUrl) => {
      expect(() => new OkvnsWrapper({ baseUrl: baseUrl as unknown as string })).toThrow(
        OkvnsConfigurationError,
      );
    },
  );

  it('GIVEN no injected fetch WHEN read THEN the global fetch is used, bound to globalThis', async () => {
    const seen: unknown[] = [];
    vi.stubGlobal('fetch', function (this: unknown) {
      seen.push(this);
      return Promise.resolve(respond(200, { value: 'from-global' }));
    });

    await expect(new OkvnsWrapper({ baseUrl: 'http://a' }).read('n', 'k', 'd')).resolves.toBe(
      'from-global',
    );
    expect(seen[0]).toBe(globalThis);
  });

  it('GIVEN a runtime without fetch WHEN read THEN a configuration error is thrown', async () => {
    vi.stubGlobal('fetch', undefined);
    const wrapper = new OkvnsWrapper({ baseUrl: 'http://a' });

    const error = await wrapper.read('n', 'k', 'd').catch((e) => e);

    expect(error).toBeInstanceOf(OkvnsConfigurationError);
    expect(error.kind).toBe('configuration');
  });
});

describe('public API surface', () => {
  it('GIVEN the package entry WHEN inspected THEN it exports exactly the documented runtime names', () => {
    expect(Object.keys(api).sort()).toEqual([
      'OkvnsConfigurationError',
      'OkvnsInvalidResponseError',
      'OkvnsNetworkError',
      'OkvnsServerError',
      'OkvnsUnexpectedResponseError',
      'OkvnsValidationError',
      'OkvnsWrapper',
      'OkvnsWrapperError',
    ]);
  });

  it('GIVEN every error class WHEN instantiated THEN it extends the base and sets its name', () => {
    const errors = [
      new OkvnsConfigurationError('c'),
      new OkvnsNetworkError('n'),
      new OkvnsValidationError('v'),
      new OkvnsServerError('s', 500),
      new OkvnsInvalidResponseError('i'),
      new OkvnsUnexpectedResponseError('u', 418),
    ];

    for (const error of errors) {
      expect(error).toBeInstanceOf(OkvnsWrapperError);
      expect(error.name).toBe(error.constructor.name);
    }
    expect(errors.map((error) => error.kind)).toEqual([
      'configuration',
      'network',
      'validation',
      'server',
      'invalid-response',
      'unexpected-response',
    ]);
  });
});
