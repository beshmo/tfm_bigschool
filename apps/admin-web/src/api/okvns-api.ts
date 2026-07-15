import type { EntryDto, NamespaceDto } from '@okvns/shared';
import { ApiError } from './api-error';

export interface EntryChangesInput {
  name?: string;
  value?: string;
  /** A blank description clears the stored one; omit it to keep the current one. */
  description?: string;
  /** Omit to keep the stored environment-dependence marker. */
  env_dependent?: boolean;
}

/** Partial namespace update: a name, a description, or both. */
export interface NamespaceChangesInput {
  name?: string;
  /** A blank description clears the stored one; omit it to keep the current one. */
  description?: string;
}

/** The admin frontend's view of the OKVNS API. Components depend on this port. */
export interface OkvnsApi {
  listNamespaces(): Promise<NamespaceDto[]>;
  createNamespace(name: string, description?: string): Promise<NamespaceDto>;
  getNamespace(name: string): Promise<NamespaceDto>;
  updateNamespace(name: string, changes: NamespaceChangesInput): Promise<NamespaceDto>;
  deleteNamespace(name: string): Promise<void>;
  listEntries(namespace: string): Promise<EntryDto[]>;
  createEntry(
    namespace: string,
    name: string,
    value: string,
    description?: string,
    envDependent?: boolean,
  ): Promise<EntryDto>;
  updateEntry(namespace: string, name: string, changes: EntryChangesInput): Promise<EntryDto>;
  deleteEntry(namespace: string, name: string): Promise<void>;
  importYaml(yaml: string): Promise<NamespaceDto[]>;
  importYamlFile(file: File): Promise<NamespaceDto[]>;
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

  createNamespace(name: string, description?: string): Promise<NamespaceDto> {
    return this.request('/namespaces', {
      method: 'POST',
      headers: JSON_HEADERS,
      body: JSON.stringify({ name, ...(description === undefined ? {} : { description }) }),
    });
  }

  getNamespace(name: string): Promise<NamespaceDto> {
    return this.request(`/namespaces/${encodeURIComponent(name)}`);
  }

  updateNamespace(name: string, changes: NamespaceChangesInput): Promise<NamespaceDto> {
    return this.request(`/namespaces/${encodeURIComponent(name)}`, {
      method: 'PUT',
      headers: JSON_HEADERS,
      body: JSON.stringify(changes),
    });
  }

  deleteNamespace(name: string): Promise<void> {
    return this.request(`/namespaces/${encodeURIComponent(name)}`, { method: 'DELETE' });
  }

  listEntries(namespace: string): Promise<EntryDto[]> {
    return this.request(`/namespaces/${encodeURIComponent(namespace)}/entries`);
  }

  createEntry(
    namespace: string,
    name: string,
    value: string,
    description?: string,
    envDependent?: boolean,
  ): Promise<EntryDto> {
    return this.request(`/namespaces/${encodeURIComponent(namespace)}/entries`, {
      method: 'POST',
      headers: JSON_HEADERS,
      body: JSON.stringify({
        name,
        value,
        ...(description === undefined ? {} : { description }),
        ...(envDependent === undefined ? {} : { env_dependent: envDependent }),
      }),
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

  async importYaml(yaml: string): Promise<NamespaceDto[]> {
    const result = await this.request<{ namespaces: NamespaceDto[] }>('/yaml/import', {
      method: 'POST',
      headers: JSON_HEADERS,
      body: JSON.stringify({ yaml }),
    });
    return result.namespaces;
  }

  async importYamlFile(file: File): Promise<NamespaceDto[]> {
    // The selected file is posted as multipart form data under field `file`.
    // Content-Type is intentionally left unset so the browser adds the boundary.
    const form = new FormData();
    form.append('file', file);
    const result = await this.request<{ namespaces: NamespaceDto[] }>('/yaml/import', {
      method: 'POST',
      body: form,
    });
    return result.namespaces;
  }

  async exportAll(): Promise<string> {
    const result = await this.request<{ yaml: string }>('/yaml/export');
    return result.yaml;
  }

  async exportNamespace(name: string): Promise<string> {
    const result = await this.request<{ yaml: string }>(`/yaml/export/${encodeURIComponent(name)}`);
    return result.yaml;
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
