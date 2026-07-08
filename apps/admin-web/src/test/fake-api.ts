import type { EntryDto, NamespaceDto } from '@okvns/shared';
import { compareNames } from '@okvns/shared';
import { ApiError } from '../api/api-error';
import type { EntryChangesInput, OkvnsApi } from '../api/okvns-api';

/**
 * In-memory OkvnsApi used by component tests. Mirrors the server's behavior
 * closely enough to exercise UI flows and error display without a real backend.
 */
export class FakeOkvnsApi implements OkvnsApi {
  private readonly namespaces = new Map<string, Map<string, string>>();

  seed(namespaces: NamespaceDto[]): void {
    for (const ns of namespaces) {
      this.namespaces.set(ns.name, new Map(ns.entries.map((e) => [e.name, e.value])));
    }
  }

  private toDto(name: string): NamespaceDto {
    const entries = this.namespaces.get(name) ?? new Map();
    return {
      name,
      entries: [...entries.entries()]
        .map(([entryName, value]) => ({ name: entryName, value }))
        .sort((a, b) => compareNames(a.name, b.name)),
    };
  }

  async listNamespaces(): Promise<NamespaceDto[]> {
    return [...this.namespaces.keys()].sort(compareNames).map((name) => this.toDto(name));
  }

  async createNamespace(name: string): Promise<NamespaceDto> {
    if (this.namespaces.has(name)) {
      throw new ApiError('DUPLICATE_NAMESPACE', `Namespace "${name}" already exists.`, [], 409);
    }
    this.namespaces.set(name, new Map());
    return this.toDto(name);
  }

  async getNamespace(name: string): Promise<NamespaceDto> {
    this.assertNamespace(name);
    return this.toDto(name);
  }

  async renameNamespace(name: string, newName: string): Promise<NamespaceDto> {
    this.assertNamespace(name);
    if (newName !== name && this.namespaces.has(newName)) {
      throw new ApiError('DUPLICATE_NAMESPACE', `Namespace "${newName}" already exists.`, [], 409);
    }
    const entries = this.namespaces.get(name)!;
    this.namespaces.delete(name);
    this.namespaces.set(newName, entries);
    return this.toDto(newName);
  }

  async deleteNamespace(name: string): Promise<void> {
    this.assertNamespace(name);
    this.namespaces.delete(name);
  }

  async listEntries(namespace: string): Promise<EntryDto[]> {
    this.assertNamespace(namespace);
    return this.toDto(namespace).entries;
  }

  async createEntry(namespace: string, name: string, value: string): Promise<EntryDto> {
    const entries = this.assertNamespace(namespace);
    if (entries.has(name)) {
      throw new ApiError('DUPLICATE_ENTRY', `Entry "${name}" already exists.`, [], 409);
    }
    entries.set(name, value);
    return { name, value };
  }

  async updateEntry(
    namespace: string,
    name: string,
    changes: EntryChangesInput,
  ): Promise<EntryDto> {
    const entries = this.assertNamespace(namespace);
    if (!entries.has(name)) {
      throw new ApiError('ENTRY_NOT_FOUND', `Entry "${name}" was not found.`, [], 404);
    }
    const nextName = changes.name ?? name;
    const nextValue = changes.value ?? entries.get(name)!;
    entries.delete(name);
    entries.set(nextName, nextValue);
    return { name: nextName, value: nextValue };
  }

  async deleteEntry(namespace: string, name: string): Promise<void> {
    const entries = this.assertNamespace(namespace);
    entries.delete(name);
  }

  async importMarkdown(markdown: string): Promise<NamespaceDto[]> {
    if (!markdown.includes('namespace')) {
      throw new ApiError('INVALID_MARKDOWN', 'Markdown content is not valid.', [], 400);
    }
    return this.listNamespaces();
  }

  async exportAll(): Promise<string> {
    const names = [...this.namespaces.keys()].sort(compareNames).join(', ');
    return `namespaces: ${names}`;
  }

  async exportNamespace(name: string): Promise<string> {
    this.assertNamespace(name);
    return `namespaces: ${name}`;
  }

  private assertNamespace(name: string): Map<string, string> {
    const entries = this.namespaces.get(name);
    if (!entries) {
      throw new ApiError('NAMESPACE_NOT_FOUND', `Namespace "${name}" was not found.`, [], 404);
    }
    return entries;
  }
}
