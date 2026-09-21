import {
  mergeImported,
  queryEntries,
  queryNamespaces,
  stampNamespace,
  type NamespaceRepository,
  type NamespaceSummary,
  type PageResult,
} from '@okvns/application';
import {
  DuplicateNamespaceError,
  NamespaceNotFoundError,
  type Entry,
  type Namespace,
} from '@okvns/domain';
import { compareNames, type EntryListQuery, type NamespaceListQuery } from '@okvns/shared';

/**
 * Non-durable `NamespaceRepository` used by `OKVNS_STORAGE_DRIVER=memory`, demos
 * and tests. It assigns `createdAt`/`modifiedAt` itself, following the same
 * rules as the MySQL adapter. Every mutation stages its result first, so a
 * failure leaves the store untouched.
 */
export class InMemoryNamespaceRepository implements NamespaceRepository {
  private store = new Map<string, Namespace>();

  constructor(private readonly now: () => Date = () => new Date()) {}

  async create(namespace: Namespace): Promise<Namespace> {
    if (this.store.has(namespace.name)) {
      throw new DuplicateNamespaceError(namespace.name);
    }
    const stamped = stampNamespace(undefined, namespace, this.now());
    this.store.set(stamped.name, stamped);
    return stamped;
  }

  async findByName(name: string): Promise<Namespace | undefined> {
    return this.store.get(name);
  }

  async save(namespace: Namespace): Promise<Namespace> {
    const previous = this.store.get(namespace.name);
    if (!previous) {
      throw new NamespaceNotFoundError(namespace.name);
    }
    const stamped = stampNamespace(previous, namespace, this.now());
    this.store.set(stamped.name, stamped);
    return stamped;
  }

  async rename(currentName: string, updated: Namespace): Promise<Namespace> {
    const previous = this.store.get(currentName);
    if (!previous) {
      throw new NamespaceNotFoundError(currentName);
    }
    if (updated.name !== currentName && this.store.has(updated.name)) {
      throw new DuplicateNamespaceError(updated.name);
    }
    const stamped = stampNamespace(previous, updated, this.now());
    const next = new Map(this.store);
    next.delete(currentName);
    next.set(stamped.name, stamped);
    this.store = next;
    return stamped;
  }

  async delete(name: string): Promise<boolean> {
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
    this.store = staged;
    return result;
  }
}
