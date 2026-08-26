import {
  DuplicateNamespaceError,
  NamespaceNotFoundError,
  type Entry,
  type Namespace,
} from '@okvns/domain';
import type { EntryListQuery, NamespaceListQuery } from '@okvns/shared';
import { queryEntries, queryNamespaces } from '../list-query.js';
import type { NamespaceRepository, NamespaceSummary, PageResult } from '../ports.js';

/** In-memory test double mirroring the production in-memory adapter semantics. */
export class FakeNamespaceRepository implements NamespaceRepository {
  private readonly store = new Map<string, Namespace>();

  async list(): Promise<Namespace[]> {
    return [...this.store.values()];
  }

  async listPage(query: NamespaceListQuery): Promise<PageResult<NamespaceSummary>> {
    return queryNamespaces([...this.store.values()], query);
  }

  async listEntriesPage(
    namespaceName: string,
    query: EntryListQuery,
  ): Promise<PageResult<Entry> | null> {
    const namespace = this.store.get(namespaceName);
    return namespace ? queryEntries(namespace.listEntries(), query) : null;
  }

  async findByName(name: string): Promise<Namespace | null> {
    return this.store.get(name) ?? null;
  }

  async existsByName(name: string): Promise<boolean> {
    return this.store.has(name);
  }

  async create(namespace: Namespace): Promise<void> {
    if (this.store.has(namespace.name)) {
      throw new DuplicateNamespaceError(namespace.name);
    }
    this.store.set(namespace.name, namespace);
  }

  async save(namespace: Namespace): Promise<void> {
    this.store.set(namespace.name, namespace);
  }

  async delete(name: string): Promise<boolean> {
    return this.store.delete(name);
  }

  async rename(currentName: string, newName: string): Promise<void> {
    const namespace = this.store.get(currentName);
    if (!namespace) {
      throw new NamespaceNotFoundError(currentName);
    }
    if (currentName !== newName && this.store.has(newName)) {
      throw new DuplicateNamespaceError(newName);
    }
    namespace.rename(newName);
    this.store.delete(currentName);
    this.store.set(newName, namespace);
  }

  async importNamespaces(namespaces: Namespace[]): Promise<void> {
    for (const namespace of namespaces) {
      this.store.set(namespace.name, namespace);
    }
  }
}
