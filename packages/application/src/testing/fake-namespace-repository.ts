import { DuplicateNamespaceError, Entry, Namespace, NamespaceNotFoundError } from '@okvns/domain';
import { compareNames, type EntryListQuery, type NamespaceListQuery } from '@okvns/shared';
import { queryEntries, queryNamespaces } from '../list-query.js';
import type { NamespaceRepository, NamespaceSummary, PageResult } from '../ports.js';
import { mergeImported } from '../merge-imported.js';
import { stampNamespace } from '../timestamps.js';

/** In-memory `NamespaceRepository` for fast, infrastructure-free unit tests. */
export class FakeNamespaceRepository implements NamespaceRepository {
  private readonly store = new Map<string, Namespace>();
  /** Counts every mutating call, so tests can assert nothing was written. */
  writes = 0;

  constructor(private now: () => Date = () => new Date()) {}

  async create(namespace: Namespace): Promise<Namespace> {
    if (this.store.has(namespace.name)) {
      throw new DuplicateNamespaceError(namespace.name);
    }
    return this.put(namespace.name, stampNamespace(undefined, namespace, this.now()));
  }

  async findByName(name: string): Promise<Namespace | undefined> {
    return this.store.get(name);
  }

  async save(namespace: Namespace): Promise<Namespace> {
    const previous = this.store.get(namespace.name);
    if (!previous) {
      throw new NamespaceNotFoundError(namespace.name);
    }
    return this.put(namespace.name, stampNamespace(previous, namespace, this.now()));
  }

  async rename(currentName: string, updated: Namespace): Promise<Namespace> {
    const previous = this.store.get(currentName);
    if (!previous) {
      throw new NamespaceNotFoundError(currentName);
    }
    if (this.store.has(updated.name)) {
      throw new DuplicateNamespaceError(updated.name);
    }
    this.store.delete(currentName);
    return this.put(updated.name, stampNamespace(previous, updated, this.now()));
  }

  async delete(name: string): Promise<boolean> {
    this.writes += 1;
    return this.store.delete(name);
  }

  async listNamespaces(query: NamespaceListQuery): Promise<PageResult<NamespaceSummary>> {
    return queryNamespaces([...this.store.values()], query);
  }

  async listEntries(
    namespaceName: string,
    query: EntryListQuery,
  ): Promise<PageResult<Entry> | undefined> {
    const namespace = this.store.get(namespaceName);
    return namespace ? queryEntries(namespace.entries, query) : undefined;
  }

  async listAll(): Promise<Namespace[]> {
    return [...this.store.values()].sort((a, b) => compareNames(a.name, b.name));
  }

  async importNamespaces(namespaces: readonly Namespace[]): Promise<Namespace[]> {
    const now = this.now();
    const staged = new Map(this.store);
    const result = namespaces.map((incoming) => {
      const previous = staged.get(incoming.name);
      const stamped = stampNamespace(previous, mergeImported(previous, incoming), now);
      staged.set(stamped.name, stamped);
      return stamped;
    });
    this.writes += 1;
    this.store.clear();
    staged.forEach((namespace, name) => this.store.set(name, namespace));
    return result;
  }

  private put(name: string, namespace: Namespace): Namespace {
    this.writes += 1;
    this.store.set(name, namespace);
    return namespace;
  }
}
