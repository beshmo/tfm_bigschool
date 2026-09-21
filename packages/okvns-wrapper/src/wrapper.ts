import { ERROR_CODES } from '@okvns/shared';
import {
  OkvnsConfigurationError,
  OkvnsInvalidResponseError,
  OkvnsNetworkError,
  OkvnsServerError,
  OkvnsUnexpectedResponseError,
  OkvnsValidationError,
} from './errors.js';

/** The subset of a fetch `Response` the wrapper relies on. */
export interface FetchLikeResponse {
  ok: boolean;
  status: number;
  json(): Promise<unknown>;
}

/** A fetch-compatible function; the global `fetch` satisfies it. */
export type FetchLike = (
  input: string,
  init?: { method?: string; headers?: Record<string, string> },
) => Promise<FetchLikeResponse>;

export interface OkvnsWrapperOptions {
  /** Base URL of a running OKVNS API, for example `http://localhost:3000`. */
  baseUrl: string;
  /** Custom fetch implementation; defaults to the runtime's global `fetch`. */
  fetch?: FetchLike;
}

async function readJson(response: FetchLikeResponse): Promise<unknown> {
  try {
    return await response.json();
  } catch {
    return undefined;
  }
}

function errorCodeOf(body: unknown): string | undefined {
  if (typeof body !== 'object' || body === null) {
    return undefined;
  }
  const error = (body as { error?: unknown }).error;
  if (typeof error !== 'object' || error === null) {
    return undefined;
  }
  const code = (error as { code?: unknown }).code;
  return typeof code === 'string' ? code : undefined;
}

/** Read-only client that fetches entry values from a running OKVNS API. */
export class OkvnsWrapper {
  private readonly baseUrl: string;
  private readonly fetchImpl: FetchLike | undefined;

  constructor(options: OkvnsWrapperOptions) {
    const baseUrl = options.baseUrl?.trim().replace(/\/+$/, '');
    if (!baseUrl) {
      throw new OkvnsConfigurationError('OkvnsWrapper requires a non-empty baseUrl.');
    }
    this.baseUrl = baseUrl;
    this.fetchImpl = options.fetch;
  }

  /**
   * Reads an entry value. Resolves to `defaultValue` when the namespace or the
   * entry does not exist; every other failure rejects with an `OkvnsWrapperError`.
   */
  async read(namespace: string, entry: string, defaultValue: string): Promise<string> {
    const url = `${this.baseUrl}/namespaces/${encodeURIComponent(namespace)}/entries/${encodeURIComponent(entry)}`;

    let response: FetchLikeResponse;
    try {
      response = await this.resolveFetch()(url, {
        method: 'GET',
        headers: { Accept: 'application/json' },
      });
    } catch (error) {
      if (error instanceof OkvnsConfigurationError) {
        throw error;
      }
      throw new OkvnsNetworkError(`Could not reach the OKVNS API at ${this.baseUrl}.`, error);
    }

    const body = await readJson(response);
    if (response.ok) {
      const value = (body as { value?: unknown } | undefined)?.value;
      if (typeof value !== 'string') {
        throw new OkvnsInvalidResponseError(
          'The OKVNS API response did not contain a string value.',
        );
      }
      return value;
    }

    const code = errorCodeOf(body);
    if (
      response.status === 404 &&
      (code === ERROR_CODES.NAMESPACE_NOT_FOUND || code === ERROR_CODES.ENTRY_NOT_FOUND)
    ) {
      return defaultValue;
    }
    if (response.status === 400) {
      throw new OkvnsValidationError(`The OKVNS API rejected the request (${code ?? 'HTTP 400'}).`);
    }
    if (response.status >= 500) {
      throw new OkvnsServerError(
        `The OKVNS API failed with HTTP ${response.status}.`,
        response.status,
      );
    }
    throw new OkvnsUnexpectedResponseError(
      `The OKVNS API returned an unexpected response (HTTP ${response.status}).`,
      response.status,
    );
  }

  private resolveFetch(): FetchLike {
    if (this.fetchImpl) {
      return this.fetchImpl;
    }
    // The wrapper avoids the DOM lib, so the global is read untyped.
    const globalFetch = (globalThis as { fetch?: unknown }).fetch;
    if (typeof globalFetch !== 'function') {
      throw new OkvnsConfigurationError(
        'No fetch implementation is available; pass one in the options.',
      );
    }
    // Bound so the native fetch never runs with a non-global `this`.
    return (globalFetch as FetchLike).bind(globalThis);
  }
}
