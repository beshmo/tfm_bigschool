import type { EntryDto, NamespaceDto } from '@okvns/shared';
import { ApiError } from './api-error';

export interface EntryChangesInput {
  name?: string;
  value?: string;
}

/** The admin frontend's view of the OKVNS API. Components depend on this port. */
export interface OkvnsApi {
  listNamespaces(): Promise<NamespaceDto[]>;
  createNamespace(name: string): Promise<NamespaceDto>;
  getNamespace(name: string): Promise<NamespaceDto>;
  renameNamespace(name: string, newName: string): Promise<NamespaceDto>;
  deleteNamespace(name: string): Promise<void>;
  listEntries(namespace: string): Promise<EntryDto[]>;
  createEntry(namespace: string, name: string, value: string): Promise<EntryDto>;
  updateEntry(namespace: string, name: string, changes: EntryChangesInput): Promise<EntryDto>;
  deleteEntry(namespace: string, name: string): Promise<void>;
  importMarkdown(markdown: string): Promise<NamespaceDto[]>;
  exportAll(): Promise<string>;
  exportNamespace(name: string): Promise<string>;
}

type FetchLike = typeof fetch;

const JSON_HEADERS = { 'Content-Type': 'application/json' };

/** HTTP implementation of {@link OkvnsApi}; owns all request/response mapping. */
export class HttpOkvnsApi implements OkvnsApi {
  private readonly fetchImpl: FetchLike;

  constructor(
    private readonly baseUrl: string,
    fetchImpl?: FetchLike,
  ) {
    // Wrap the global fetch so it is always invoked with the correct `this`
    // binding (calling it as a method would trigger an "Illegal invocation").
    this.fetchImpl = fetchImpl ?? ((input, init) => fetch(input, init));
  }

  private async request<T>(path: string, init?: RequestInit): Promise<T> {
    let response: Response;
    try {
      response = await this.fetchImpl(`${this.baseUrl}${path}`, init);
    } catch {
      throw new ApiError('NETWORK_ERROR', 'Unable to reach the OKVNS API.');
    }

    if (response.status === 204) {
      return undefined as T;
    }

    const raw = await response.text();
    const body = parseJson(raw);

    if (!response.ok) {
      throw toApiError(body, response.status);
    }
    return body as T;
  }

  listNamespaces(): Promise<NamespaceDto[]> {
    return this.request('/namespaces');
  }

  createNamespace(name: string): Promise<NamespaceDto> {
    return this.request('/namespaces', {
      method: 'POST',
      headers: JSON_HEADERS,
      body: JSON.stringify({ name }),
    });
  }

  getNamespace(name: string): Promise<NamespaceDto> {
    return this.request(`/namespaces/${encodeURIComponent(name)}`);
  }

  renameNamespace(name: string, newName: string): Promise<NamespaceDto> {
    return this.request(`/namespaces/${encodeURIComponent(name)}`, {
      method: 'PUT',
      headers: JSON_HEADERS,
      body: JSON.stringify({ name: newName }),
    });
  }

  deleteNamespace(name: string): Promise<void> {
    return this.request(`/namespaces/${encodeURIComponent(name)}`, { method: 'DELETE' });
  }

  listEntries(namespace: string): Promise<EntryDto[]> {
    return this.request(`/namespaces/${encodeURIComponent(namespace)}/entries`);
  }

  createEntry(namespace: string, name: string, value: string): Promise<EntryDto> {
    return this.request(`/namespaces/${encodeURIComponent(namespace)}/entries`, {
      method: 'POST',
      headers: JSON_HEADERS,
      body: JSON.stringify({ name, value }),
    });
  }

  updateEntry(namespace: string, name: string, changes: EntryChangesInput): Promise<EntryDto> {
    return this.request(
      `/namespaces/${encodeURIComponent(namespace)}/entries/${encodeURIComponent(name)}`,
      { method: 'PUT', headers: JSON_HEADERS, body: JSON.stringify(changes) },
    );
  }

  deleteEntry(namespace: string, name: string): Promise<void> {
    return this.request(
      `/namespaces/${encodeURIComponent(namespace)}/entries/${encodeURIComponent(name)}`,
      { method: 'DELETE' },
    );
  }

  async importMarkdown(markdown: string): Promise<NamespaceDto[]> {
    const result = await this.request<{ namespaces: NamespaceDto[] }>('/markdown/import', {
      method: 'POST',
      headers: JSON_HEADERS,
      body: JSON.stringify({ markdown }),
    });
    return result.namespaces;
  }

  async exportAll(): Promise<string> {
    const result = await this.request<{ markdown: string }>('/markdown/export');
    return result.markdown;
  }

  async exportNamespace(name: string): Promise<string> {
    const result = await this.request<{ markdown: string }>(
      `/markdown/export/${encodeURIComponent(name)}`,
    );
    return result.markdown;
  }
}

function parseJson(raw: string): unknown {
  if (!raw) {
    return undefined;
  }
  try {
    return JSON.parse(raw);
  } catch {
    return undefined;
  }
}

/** Maps a safe API error body into an {@link ApiError}. */
export function toApiError(body: unknown, status: number): ApiError {
  if (typeof body === 'object' && body !== null && 'error' in body) {
    const error = (body as { error: unknown }).error;
    if (typeof error === 'object' && error !== null) {
      const shape = error as { code?: unknown; message?: unknown; details?: unknown };
      return new ApiError(
        typeof shape.code === 'string' ? shape.code : 'UNKNOWN',
        typeof shape.message === 'string' ? shape.message : 'Request failed.',
        Array.isArray(shape.details) ? shape.details.map(String) : [],
        status,
      );
    }
  }
  return new ApiError('UNKNOWN', 'Request failed.', [], status);
}
