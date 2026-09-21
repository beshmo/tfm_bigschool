import { compareNames, totalPages } from '@okvns/shared';
import type {
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
} from '@okvns/shared';
import { ApiError } from '../api/api-error';
import type { OkvnsApi } from '../api/okvns-api';

/** An in-memory `OkvnsApi` that behaves like the real API, for page-level tests. */
export class FakeApi implements OkvnsApi {
  namespaces = new Map<string, NamespaceDto>();
  calls: { method: string; args: unknown[] }[] = [];
  importResult: NamespaceDto[] = [];
  exportResult = 'namespaces: []\n';
  /** Rejects the next call to the named method with this error. */
  private failures = new Map<string, unknown>();
  private tick = 0;

  failNext(method: string, error: unknown): void {
    this.failures.set(method, error);
  }

  callsTo(method: string) {
    return this.calls.filter((call) => call.method === method);
  }

  seed(name: string, entries: Partial<EntryDto>[] = [], extra: Partial<NamespaceDto> = {}) {
    const stamp = this.now();
    this.namespaces.set(name, {
      name,
      entries: entries.map((entry, index) => ({
        name: `entry-${index}`,
        value: 'v',
        env_dependent: false,
        created_at: stamp,
        modified_at: stamp,
        ...entry,
      })),
      created_at: stamp,
      modified_at: stamp,
      ...extra,
    });
    return this;
  }

  private now(): string {
    return new Date(Date.UTC(2026, 8, 21, 10, 0, this.tick++)).toISOString();
  }

  private async begin(method: string, ...args: unknown[]): Promise<void> {
    this.calls.push({ method, args });
    await Promise.resolve();
    const failure = this.failures.get(method);
    if (failure) {
      this.failures.delete(method);
      throw failure;
    }
  }

  private require(name: string): NamespaceDto {
    const namespace = this.namespaces.get(name);
    if (!namespace) {
      throw new ApiError(404, 'NAMESPACE_NOT_FOUND', `Namespace "${name}" was not found.`);
    }
    return namespace;
  }

  private page<T extends { name: string }>(
    rows: T[],
    query: NamespaceListQuery | EntryListQuery,
    key: (row: T) => string | number,
  ): PaginatedResultDto<T> {
    const filter = query.name?.toLowerCase();
    const filtered = rows.filter((row) => !filter || row.name.toLowerCase().includes(filter));
    const sign = query.direction === 'asc' ? 1 : -1;
    filtered.sort((a, b) => {
      const left = key(a);
      const right = key(b);
      const primary =
        typeof left === 'string' && typeof right === 'string'
          ? compareNames(left, right)
          : Number(left) - Number(right);
      return primary === 0 ? compareNames(a.name, b.name) : sign * primary;
    });
    const start = (query.page - 1) * query.pageSize;
    return {
      items: filtered.slice(start, start + query.pageSize),
      page: query.page,
      page_size: query.pageSize,
      total_items: filtered.length,
      total_pages: totalPages(filtered.length, query.pageSize),
    };
  }

  async listNamespaces(query: NamespaceListQuery) {
    await this.begin('listNamespaces', query);
    const rows: NamespaceListItemDto[] = [...this.namespaces.values()].map(
      ({ entries: _entries, ...item }) => item,
    );
    return this.page(rows, query, (row) => (query.sort === 'name' ? row.name : row[query.sort]));
  }

  async createNamespace(input: NamespaceInputDto) {
    await this.begin('createNamespace', input);
    if (this.namespaces.has(input.name)) {
      throw new ApiError(409, 'DUPLICATE_NAMESPACE', `Namespace "${input.name}" already exists.`);
    }
    const stamp = this.now();
    const namespace: NamespaceDto = {
      name: input.name,
      ...(input.description ? { description: input.description } : {}),
      entries: [],
      created_at: stamp,
      modified_at: stamp,
    };
    this.namespaces.set(input.name, namespace);
    return namespace;
  }

  async getNamespace(name: string) {
    await this.begin('getNamespace', name);
    return structuredClone(this.require(name));
  }

  async updateNamespace(name: string, input: NamespaceUpdateDto) {
    await this.begin('updateNamespace', name, input);
    const current = this.require(name);
    if (input.name && input.name !== name && this.namespaces.has(input.name)) {
      throw new ApiError(409, 'DUPLICATE_NAMESPACE', `Namespace "${input.name}" already exists.`);
    }
    const updated: NamespaceDto = {
      ...current,
      name: input.name ?? current.name,
      modified_at: this.now(),
    };
    if (input.description !== undefined) {
      if (input.description.trim()) updated.description = input.description.trim();
      else delete updated.description;
    }
    this.namespaces.delete(name);
    this.namespaces.set(updated.name, updated);
    return structuredClone(updated);
  }

  async deleteNamespace(name: string) {
    await this.begin('deleteNamespace', name);
    this.require(name);
    this.namespaces.delete(name);
  }

  async listEntries(namespace: string, query: EntryListQuery) {
    await this.begin('listEntries', namespace, query);
    const rows = this.require(namespace).entries.filter(
      (entry) => query.envDependent === undefined || entry.env_dependent === query.envDependent,
    );
    return this.page(rows, query, (row) => {
      if (query.sort === 'name') return row.name;
      if (query.sort === 'env_dependent') return row.env_dependent ? 1 : 0;
      return row[query.sort];
    });
  }

  async createEntry(namespace: string, input: EntryInputDto) {
    await this.begin('createEntry', namespace, input);
    const target = this.require(namespace);
    if (target.entries.some((entry) => entry.name === input.name)) {
      throw new ApiError(409, 'DUPLICATE_ENTRY', `Entry "${input.name}" already exists.`);
    }
    const stamp = this.now();
    const entry: EntryDto = {
      name: input.name,
      value: input.value,
      ...(input.description ? { description: input.description } : {}),
      env_dependent: input.env_dependent ?? false,
      created_at: stamp,
      modified_at: stamp,
    };
    target.entries.push(entry);
    target.modified_at = stamp;
    return entry;
  }

  async updateEntry(namespace: string, name: string, input: EntryUpdateDto) {
    await this.begin('updateEntry', namespace, name, input);
    const target = this.require(namespace);
    const index = target.entries.findIndex((entry) => entry.name === name);
    if (index < 0) {
      throw new ApiError(404, 'ENTRY_NOT_FOUND', `Entry "${name}" was not found in the namespace.`);
    }
    const current = target.entries[index]!;
    const updated: EntryDto = {
      ...current,
      name: input.name ?? current.name,
      value: input.value ?? current.value,
      env_dependent: input.env_dependent ?? current.env_dependent,
      modified_at: this.now(),
    };
    if (input.description !== undefined) {
      if (input.description.trim()) updated.description = input.description.trim();
      else delete updated.description;
    }
    target.entries[index] = updated;
    target.modified_at = updated.modified_at;
    return updated;
  }

  async deleteEntry(namespace: string, name: string) {
    await this.begin('deleteEntry', namespace, name);
    const target = this.require(namespace);
    target.entries = target.entries.filter((entry) => entry.name !== name);
  }

  async importYaml(yaml: string) {
    await this.begin('importYaml', yaml);
    return this.importResult;
  }

  async importYamlFile(file: File) {
    await this.begin('importYamlFile', file);
    return this.importResult;
  }

  async exportAll() {
    await this.begin('exportAll');
    return this.exportResult;
  }

  async exportNamespace(name: string) {
    await this.begin('exportNamespace', name);
    return `namespaces:\n  - name: ${name}\n    entries: []\n`;
  }
}
