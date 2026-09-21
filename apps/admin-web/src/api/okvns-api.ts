import type {
  ApiErrorDto,
  EntryDto,
  EntryInputDto,
  EntryListQuery,
  EntryUpdateDto,
  NamespaceDto,
  NamespaceInputDto,
  NamespaceListItemDto,
  NamespaceListQuery,
  NamespaceUpdateDto,
  PaginatedResultDto,
  YamlExportResponseDto,
  YamlImportResponseDto,
} from '@okvns/shared';
import { ApiError, INVALID_RESPONSE_CODE, NETWORK_ERROR_CODE } from './api-error';

/** Everything the admin UI needs from the OKVNS API; components depend on this port only. */
export interface OkvnsApi {
  listNamespaces(query: NamespaceListQuery): Promise<PaginatedResultDto<NamespaceListItemDto>>;
  createNamespace(input: NamespaceInputDto): Promise<NamespaceDto>;
  getNamespace(name: string): Promise<NamespaceDto>;
  updateNamespace(name: string, input: NamespaceUpdateDto): Promise<NamespaceDto>;
  deleteNamespace(name: string): Promise<void>;
  listEntries(namespace: string, query: EntryListQuery): Promise<PaginatedResultDto<EntryDto>>;
  createEntry(namespace: string, input: EntryInputDto): Promise<EntryDto>;
  updateEntry(namespace: string, entry: string, input: EntryUpdateDto): Promise<EntryDto>;
  deleteEntry(namespace: string, entry: string): Promise<void>;
  /** Pasted YAML, sent as the JSON `yaml` field. */
  importYaml(yaml: string): Promise<NamespaceDto[]>;
  /** An uploaded file, sent as multipart field `file`. */
  importYamlFile(file: File): Promise<NamespaceDto[]>;
  exportAll(): Promise<string>;
  exportNamespace(name: string): Promise<string>;
}

export type FetchFn = (input: string, init?: RequestInit) => Promise<Response>;

/**
 * Calls `fetch` through a wrapper so the native function always runs with the
 * global `this`. Passing `window.fetch` around unbound throws "Illegal
 * invocation", which would be mislabelled as a network error.
 */
const defaultFetch: FetchFn = (input, init) => globalThis.fetch(input, init);

const segment = encodeURIComponent;

function listParams(query: NamespaceListQuery | EntryListQuery): string {
  const params = new URLSearchParams({
    page: String(query.page),
    page_size: String(query.pageSize),
    sort: query.sort,
    direction: query.direction,
  });
  if (query.name) {
    params.set('name', query.name);
  }
  if ('envDependent' in query && query.envDependent !== undefined) {
    params.set('env_dependent', String(query.envDependent));
  }
  return params.toString();
}

export class HttpOkvnsApi implements OkvnsApi {
  private readonly baseUrl: string;

  constructor(
    baseUrl: string,
    private readonly fetchImpl: FetchFn = defaultFetch,
  ) {
    this.baseUrl = baseUrl.replace(/\/+$/, '');
  }

  listNamespaces(query: NamespaceListQuery) {
    return this.request<PaginatedResultDto<NamespaceListItemDto>>(
      `/namespaces?${listParams(query)}`,
    );
  }

  createNamespace(input: NamespaceInputDto) {
    return this.request<NamespaceDto>('/namespaces', json('POST', input));
  }

  getNamespace(name: string) {
    return this.request<NamespaceDto>(`/namespaces/${segment(name)}`);
  }

  updateNamespace(name: string, input: NamespaceUpdateDto) {
    return this.request<NamespaceDto>(`/namespaces/${segment(name)}`, json('PUT', input));
  }

  async deleteNamespace(name: string) {
    await this.request<void>(`/namespaces/${segment(name)}`, { method: 'DELETE' });
  }

  listEntries(namespace: string, query: EntryListQuery) {
    return this.request<PaginatedResultDto<EntryDto>>(
      `/namespaces/${segment(namespace)}/entries?${listParams(query)}`,
    );
  }

  createEntry(namespace: string, input: EntryInputDto) {
    return this.request<EntryDto>(`/namespaces/${segment(namespace)}/entries`, json('POST', input));
  }

  updateEntry(namespace: string, entry: string, input: EntryUpdateDto) {
    return this.request<EntryDto>(
      `/namespaces/${segment(namespace)}/entries/${segment(entry)}`,
      json('PUT', input),
    );
  }

  async deleteEntry(namespace: string, entry: string) {
    await this.request<void>(`/namespaces/${segment(namespace)}/entries/${segment(entry)}`, {
      method: 'DELETE',
    });
  }

  async importYaml(yaml: string) {
    const response = await this.request<YamlImportResponseDto>(
      '/yaml/import',
      json('POST', { yaml }),
    );
    return response.namespaces;
  }

  async importYamlFile(file: File) {
    const form = new FormData();
    form.append('file', file, file.name);
    // No Content-Type header: the browser adds the multipart boundary itself.
    const response = await this.request<YamlImportResponseDto>('/yaml/import', {
      method: 'POST',
      body: form,
    });
    return response.namespaces;
  }

  async exportAll() {
    return (await this.request<YamlExportResponseDto>('/yaml/export')).yaml;
  }

  async exportNamespace(name: string) {
    return (await this.request<YamlExportResponseDto>(`/yaml/export/${segment(name)}`)).yaml;
  }

  private async request<T>(path: string, init?: RequestInit): Promise<T> {
    let response: Response;
    try {
      response = await this.fetchImpl(`${this.baseUrl}${path}`, init);
    } catch {
      throw new ApiError(
        0,
        NETWORK_ERROR_CODE,
        'Could not reach the OKVNS API. Check the connection and try again.',
      );
    }
    if (!response.ok) {
      throw await toApiError(response);
    }
    if (response.status === 204) {
      return undefined as T;
    }
    try {
      return (await response.json()) as T;
    } catch {
      throw new ApiError(
        response.status,
        INVALID_RESPONSE_CODE,
        'The OKVNS API sent an unreadable response.',
      );
    }
  }
}

function json(method: string, body: unknown): RequestInit {
  return { method, headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) };
}

/** Maps the API's `{ error: { code, message, details? } }` shape; falls back safely for anything else. */
async function toApiError(response: Response): Promise<ApiError> {
  try {
    const { error } = (await response.json()) as Partial<ApiErrorDto>;
    if (error && typeof error.code === 'string' && typeof error.message === 'string') {
      return new ApiError(response.status, error.code, error.message, error.details ?? []);
    }
  } catch {
    // Not JSON: fall through to the generic error.
  }
  return new ApiError(
    response.status,
    INVALID_RESPONSE_CODE,
    `The OKVNS API returned an unexpected error (HTTP ${response.status}).`,
  );
}
