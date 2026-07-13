import { ERROR_CODES, type ApiErrorDto, type EntryDto } from '@okvns/shared';

import {
  OkvnsConfigurationError,
  OkvnsInvalidResponseError,
  OkvnsNetworkError,
  OkvnsServerError,
  OkvnsUnexpectedResponseError,
  OkvnsValidationError,
} from './errors.js';

/**
 * Minimal fetch contract used by the wrapper. It intentionally matches the
 * global `fetch` signature so the runtime global can be used directly, while
 * still allowing a custom implementation to be injected for tests or runtimes
 * without a global fetch.
 */
export type FetchLike = (
  input: string,
  init?: { method?: string; headers?: Record<string, string> },
) => Promise<FetchLikeResponse>;

/** Minimal response contract consumed by the wrapper. */
export interface FetchLikeResponse {
  readonly ok: boolean;
  readonly status: number;
  json(): Promise<unknown>;
}

/** Construction options for {@link OkvnsWrapper}. */
export interface OkvnsWrapperOptions {
  /** Base URL of an already-running OKVNS API, e.g. `https://okvns.example.com`. */
  baseUrl: string;
  /**
   * Optional fetch implementation. When omitted, the runtime global `fetch` is
   * used; if the runtime has no global fetch, wrapper reads fail with a typed
   * {@link OkvnsConfigurationError}.
   */
  fetch?: FetchLike;
}

/**
 * Small, framework-independent client for reading entry values from an existing
 * OKVNS API. It wraps `GET /namespaces/:namespace/entries/:entry`, returning the
 * value when present and the caller-provided default when the namespace or entry
 * does not exist. All other failures surface as typed wrapper errors.
 */
export class OkvnsWrapper {
  private readonly baseUrl: string;
  private readonly injectedFetch: FetchLike | undefined;

  constructor(options: OkvnsWrapperOptions) {
    this.baseUrl = options.baseUrl.replace(/\/+$/, '');
    this.injectedFetch = options.fetch;
  }

  /**
   * Read an entry value from the configured OKVNS API.
   *
   * @returns the stored value, or `defaultValue` when the namespace or entry is
   *   not found.
   * @throws {OkvnsConfigurationError} when no fetch implementation is available.
   * @throws {OkvnsNetworkError} when the request fails before a response.
   * @throws {OkvnsValidationError} when the API rejects the request as invalid.
   * @throws {OkvnsServerError} when the API responds with a 5xx failure.
   * @throws {OkvnsInvalidResponseError} when a success response has no string value.
   * @throws {OkvnsUnexpectedResponseError} for any other unexpected error response.
   */
  async read(namespace: string, entry: string, defaultValue: string): Promise<string> {
    const fetchImpl = this.resolveFetch();
    const url = `${this.baseUrl}/namespaces/${encodeURIComponent(namespace)}/entries/${encodeURIComponent(entry)}`;

    let response: FetchLikeResponse;
    try {
      response = await fetchImpl(url, {
        method: 'GET',
        headers: { Accept: 'application/json' },
      });
    } catch (cause) {
      throw new OkvnsNetworkError(
        `Failed to reach OKVNS API while reading "${namespace}/${entry}".`,
        { cause },
      );
    }

    if (response.ok) {
      return this.extractValue(response, namespace, entry);
    }

    return this.handleErrorResponse(response, namespace, entry, defaultValue);
  }

  private resolveFetch(): FetchLike {
    if (this.injectedFetch) {
      return this.injectedFetch;
    }
    const globalFetch = (globalThis as { fetch?: unknown }).fetch;
    if (typeof globalFetch !== 'function') {
      throw new OkvnsConfigurationError(
        'No fetch implementation available. Provide `fetch` when constructing OkvnsWrapper.',
      );
    }
    // Bind to globalThis so native fetch keeps a valid receiver (avoids the
    // "Illegal invocation" trap when fetch is called via a detached reference).
    return (globalFetch as FetchLike).bind(globalThis);
  }

  private async extractValue(
    response: FetchLikeResponse,
    namespace: string,
    entry: string,
  ): Promise<string> {
    let body: unknown;
    try {
      body = await response.json();
    } catch (cause) {
      throw new OkvnsInvalidResponseError(
        `OKVNS API returned an unreadable success response for "${namespace}/${entry}".`,
        { cause },
      );
    }

    if (isEntryDto(body)) {
      return body.value;
    }

    throw new OkvnsInvalidResponseError(
      `OKVNS API returned a success response without a string value for "${namespace}/${entry}".`,
    );
  }

  private async handleErrorResponse(
    response: FetchLikeResponse,
    namespace: string,
    entry: string,
    defaultValue: string,
  ): Promise<string> {
    const parsed = await parseErrorBody(response);
    const code = parsed?.error?.code;

    // Configuration-miss fallback: a known not-found code, or a bare 404 whose
    // error body was malformed/unreadable (so `parseErrorBody` yielded no code).
    // A 404 carrying any other code is not a plain miss and falls through below.
    if (
      code === ERROR_CODES.NAMESPACE_NOT_FOUND ||
      code === ERROR_CODES.ENTRY_NOT_FOUND ||
      (response.status === 404 && code === undefined)
    ) {
      return defaultValue;
    }

    if (code === ERROR_CODES.VALIDATION) {
      throw new OkvnsValidationError(
        parsed?.error?.message ??
          `OKVNS API rejected the read of "${namespace}/${entry}" as invalid.`,
        code,
        parsed?.error?.details,
      );
    }

    if (response.status >= 500) {
      throw new OkvnsServerError(
        parsed?.error?.message ??
          `OKVNS API failed to read "${namespace}/${entry}" (status ${response.status}).`,
        response.status,
        code,
      );
    }

    throw new OkvnsUnexpectedResponseError(
      parsed?.error?.message ??
        `OKVNS API returned an unexpected response for "${namespace}/${entry}" (status ${response.status}).`,
      response.status,
      code,
    );
  }
}

/** Narrow an unknown value to an {@link EntryDto} with a string value. */
function isEntryDto(body: unknown): body is EntryDto {
  return (
    typeof body === 'object' &&
    body !== null &&
    typeof (body as { value?: unknown }).value === 'string'
  );
}

/** Best-effort parse of a safe API error body; returns undefined if unreadable. */
async function parseErrorBody(response: FetchLikeResponse): Promise<ApiErrorDto | undefined> {
  let body: unknown;
  try {
    body = await response.json();
  } catch {
    return undefined;
  }

  if (
    typeof body === 'object' &&
    body !== null &&
    typeof (body as { error?: unknown }).error === 'object' &&
    (body as { error: unknown }).error !== null
  ) {
    return body as ApiErrorDto;
  }

  return undefined;
}
