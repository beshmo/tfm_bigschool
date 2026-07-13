import { afterEach, describe, expect, it, vi } from 'vitest';

import {
  OkvnsConfigurationError,
  OkvnsInvalidResponseError,
  OkvnsNetworkError,
  OkvnsServerError,
  OkvnsUnexpectedResponseError,
  OkvnsValidationError,
  OkvnsWrapper,
  type FetchLike,
  type FetchLikeResponse,
} from './index.js';

/** Build a fake fetch response with the given status and JSON body. */
function jsonResponse(status: number, body: unknown): FetchLikeResponse {
  return {
    ok: status >= 200 && status < 300,
    status,
    json: async () => body,
  };
}

/** Build a fake fetch response whose body cannot be parsed as JSON. */
function unreadableResponse(status: number): FetchLikeResponse {
  return {
    ok: status >= 200 && status < 300,
    status,
    json: async () => {
      throw new SyntaxError('Unexpected end of JSON input');
    },
  };
}

describe('OkvnsWrapper.read', () => {
  describe('GIVEN an existing entry WHEN reading', () => {
    it('THEN it resolves to the response value', async () => {
      const fetchImpl = vi.fn<FetchLike>(async () =>
        jsonResponse(200, { name: 'timeout', value: '30s' }),
      );
      const wrapper = new OkvnsWrapper({ baseUrl: 'https://okvns.example.com', fetch: fetchImpl });

      await expect(wrapper.read('service', 'timeout', 'fallback')).resolves.toBe('30s');
      expect(fetchImpl).toHaveBeenCalledWith(
        'https://okvns.example.com/namespaces/service/entries/timeout',
        { method: 'GET', headers: { Accept: 'application/json' } },
      );
    });
  });

  describe('GIVEN names and base URL that need normalization WHEN reading', () => {
    it('THEN it encodes each path segment and trims trailing slashes', async () => {
      const fetchImpl = vi.fn<FetchLike>(async () => jsonResponse(200, { name: 'x', value: 'v' }));
      const wrapper = new OkvnsWrapper({
        baseUrl: 'https://okvns.example.com/api///',
        fetch: fetchImpl,
      });

      await wrapper.read('team space', 'a/b c', 'fallback');

      expect(fetchImpl).toHaveBeenCalledWith(
        'https://okvns.example.com/api/namespaces/team%20space/entries/a%2Fb%20c',
        expect.anything(),
      );
    });
  });

  describe('GIVEN a missing namespace or entry WHEN reading', () => {
    it('THEN a namespace-not-found response returns the default value', async () => {
      const fetchImpl = vi.fn<FetchLike>(async () =>
        jsonResponse(404, { error: { code: 'NAMESPACE_NOT_FOUND', message: 'nope' } }),
      );
      const wrapper = new OkvnsWrapper({ baseUrl: 'https://okvns.example.com', fetch: fetchImpl });

      await expect(wrapper.read('missing', 'timeout', 'fallback')).resolves.toBe('fallback');
    });

    it('THEN an entry-not-found response returns the default value', async () => {
      const fetchImpl = vi.fn<FetchLike>(async () =>
        jsonResponse(404, { error: { code: 'ENTRY_NOT_FOUND', message: 'nope' } }),
      );
      const wrapper = new OkvnsWrapper({ baseUrl: 'https://okvns.example.com', fetch: fetchImpl });

      await expect(wrapper.read('service', 'missing', 'fallback')).resolves.toBe('fallback');
    });

    it('THEN a 404 with an unreadable body still returns the default value', async () => {
      const fetchImpl = vi.fn<FetchLike>(async () => unreadableResponse(404));
      const wrapper = new OkvnsWrapper({ baseUrl: 'https://okvns.example.com', fetch: fetchImpl });

      await expect(wrapper.read('service', 'timeout', 'fallback')).resolves.toBe('fallback');
    });

    it('THEN a 404 carrying a non-not-found code is NOT treated as a miss', async () => {
      const fetchImpl = vi.fn<FetchLike>(async () =>
        jsonResponse(404, { error: { code: 'SOMETHING_ELSE', message: 'no' } }),
      );
      const wrapper = new OkvnsWrapper({ baseUrl: 'https://okvns.example.com', fetch: fetchImpl });

      const error = await wrapper.read('service', 'timeout', 'fallback').catch((e) => e);
      expect(error).toBeInstanceOf(OkvnsUnexpectedResponseError);
      expect(error.status).toBe(404);
      expect(error.code).toBe('SOMETHING_ELSE');
    });
  });

  describe('GIVEN a custom fetch WHEN reading', () => {
    it('THEN the injected implementation is used', async () => {
      const fetchImpl = vi.fn<FetchLike>(async () => jsonResponse(200, { name: 'x', value: 'v' }));
      const wrapper = new OkvnsWrapper({ baseUrl: 'https://okvns.example.com', fetch: fetchImpl });

      await wrapper.read('service', 'timeout', 'fallback');

      expect(fetchImpl).toHaveBeenCalledOnce();
    });

    it('THEN the runtime global fetch is used when none is injected', async () => {
      const globalFetch = vi.fn(async () => jsonResponse(200, { name: 'x', value: 'global' }));
      vi.stubGlobal('fetch', globalFetch);
      const wrapper = new OkvnsWrapper({ baseUrl: 'https://okvns.example.com' });

      await expect(wrapper.read('service', 'timeout', 'fallback')).resolves.toBe('global');
      expect(globalFetch).toHaveBeenCalledOnce();
    });
  });

  describe('GIVEN no fetch available WHEN reading', () => {
    afterEach(() => {
      vi.unstubAllGlobals();
    });

    it('THEN it throws a configuration error', async () => {
      vi.stubGlobal('fetch', undefined);
      const wrapper = new OkvnsWrapper({ baseUrl: 'https://okvns.example.com' });

      await expect(wrapper.read('service', 'timeout', 'fallback')).rejects.toBeInstanceOf(
        OkvnsConfigurationError,
      );
    });
  });

  describe('GIVEN a transport failure WHEN reading', () => {
    it('THEN it throws a network error carrying the cause', async () => {
      const cause = new Error('ECONNREFUSED');
      const fetchImpl = vi.fn<FetchLike>(async () => {
        throw cause;
      });
      const wrapper = new OkvnsWrapper({ baseUrl: 'https://okvns.example.com', fetch: fetchImpl });

      const error = await wrapper.read('service', 'timeout', 'fallback').catch((e) => e);
      expect(error).toBeInstanceOf(OkvnsNetworkError);
      expect(error.cause).toBe(cause);
    });
  });

  describe('GIVEN a malformed success response WHEN reading', () => {
    it('THEN a non-string value throws an invalid-response error', async () => {
      const fetchImpl = vi.fn<FetchLike>(async () => jsonResponse(200, { name: 'x', value: 42 }));
      const wrapper = new OkvnsWrapper({ baseUrl: 'https://okvns.example.com', fetch: fetchImpl });

      await expect(wrapper.read('service', 'timeout', 'fallback')).rejects.toBeInstanceOf(
        OkvnsInvalidResponseError,
      );
    });

    it('THEN an unreadable success body throws an invalid-response error', async () => {
      const fetchImpl = vi.fn<FetchLike>(async () => unreadableResponse(200));
      const wrapper = new OkvnsWrapper({ baseUrl: 'https://okvns.example.com', fetch: fetchImpl });

      await expect(wrapper.read('service', 'timeout', 'fallback')).rejects.toBeInstanceOf(
        OkvnsInvalidResponseError,
      );
    });
  });

  describe('GIVEN an error response WHEN reading', () => {
    it('THEN a validation error throws a validation wrapper error with details', async () => {
      const fetchImpl = vi.fn<FetchLike>(async () =>
        jsonResponse(400, {
          error: { code: 'VALIDATION_ERROR', message: 'bad name', details: ['name invalid'] },
        }),
      );
      const wrapper = new OkvnsWrapper({ baseUrl: 'https://okvns.example.com', fetch: fetchImpl });

      const error = await wrapper.read('service', 'bad name', 'fallback').catch((e) => e);
      expect(error).toBeInstanceOf(OkvnsValidationError);
      expect(error.details).toEqual(['name invalid']);
    });

    it('THEN a validation error without a message falls back to a generated message', async () => {
      const fetchImpl = vi.fn<FetchLike>(async () =>
        jsonResponse(400, { error: { code: 'VALIDATION_ERROR' } }),
      );
      const wrapper = new OkvnsWrapper({ baseUrl: 'https://okvns.example.com', fetch: fetchImpl });

      const error = await wrapper.read('service', 'bad name', 'fallback').catch((e) => e);
      expect(error).toBeInstanceOf(OkvnsValidationError);
      expect(error.message).toContain('service/bad name');
      expect(error.details).toBeUndefined();
    });

    it('THEN a 5xx response throws a server error', async () => {
      const fetchImpl = vi.fn<FetchLike>(async () =>
        jsonResponse(500, { error: { code: 'INTERNAL_ERROR', message: 'boom' } }),
      );
      const wrapper = new OkvnsWrapper({ baseUrl: 'https://okvns.example.com', fetch: fetchImpl });

      const error = await wrapper.read('service', 'timeout', 'fallback').catch((e) => e);
      expect(error).toBeInstanceOf(OkvnsServerError);
      expect(error.status).toBe(500);
    });

    it('THEN a 5xx response with an unreadable body still throws a server error', async () => {
      const fetchImpl = vi.fn<FetchLike>(async () => unreadableResponse(503));
      const wrapper = new OkvnsWrapper({ baseUrl: 'https://okvns.example.com', fetch: fetchImpl });

      const error = await wrapper.read('service', 'timeout', 'fallback').catch((e) => e);
      expect(error).toBeInstanceOf(OkvnsServerError);
      expect(error.code).toBeUndefined();
    });

    it('THEN an unexpected error response throws an unexpected-response error', async () => {
      const fetchImpl = vi.fn<FetchLike>(async () =>
        jsonResponse(403, { error: { code: 'FORBIDDEN', message: 'no' } }),
      );
      const wrapper = new OkvnsWrapper({ baseUrl: 'https://okvns.example.com', fetch: fetchImpl });

      const error = await wrapper.read('service', 'timeout', 'fallback').catch((e) => e);
      expect(error).toBeInstanceOf(OkvnsUnexpectedResponseError);
      expect(error.status).toBe(403);
    });

    it('THEN a non-404 response with a malformed error body throws unexpected-response', async () => {
      const fetchImpl = vi.fn<FetchLike>(async () => jsonResponse(418, 'not an object'));
      const wrapper = new OkvnsWrapper({ baseUrl: 'https://okvns.example.com', fetch: fetchImpl });

      const error = await wrapper.read('service', 'timeout', 'fallback').catch((e) => e);
      expect(error).toBeInstanceOf(OkvnsUnexpectedResponseError);
      expect(error.code).toBeUndefined();
    });
  });
});
