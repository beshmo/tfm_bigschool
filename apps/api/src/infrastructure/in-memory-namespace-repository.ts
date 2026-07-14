import { Injectable } from '@nestjs/common';
import type { NamespaceRepository } from '@okvns/application';
import { DuplicateNamespaceError, NamespaceNotFoundError, type Namespace } from '@okvns/domain';

/**
 * In-memory implementation of the namespace repository port. State lives only
 * for the lifetime of the process and is intentionally lost on restart. Used by
 * the `memory` storage profile for fast local demos and tests; the durable
 * default runtime uses the MySQL adapter.
 *
 * The store holds authoritative, timestamp-stamped clones and hands out clones
 * on read, so callers mutate detached aggregates and writes can compare against
 * the prior stored state. Timestamps mirror the durable profile's contract: a
 * single write timestamp per operation, stable `createdAt`, and refreshed
 * `modifiedAt` for changed entries and for the owning namespace.
 */
@Injectable()
export class InMemoryNamespaceRepository implements NamespaceRepository {
  private readonly store = new Map<string, Namespace>();

  constructor(private readonly now: () => string = () => new Date().toISOString()) {}

  async list(): Promise<Namespace[]> {
    return [...this.store.values()].map((namespace) => namespace.clone());
  }

  async findByName(name: string): Promise<Namespace | null> {
    const namespace = this.store.get(name);
    return namespace ? namespace.clone() : null;
  }

  async existsByName(name: string): Promise<boolean> {
    return this.store.has(name);
  }

  async create(namespace: Namespace): Promise<void> {
    if (this.store.has(namespace.name)) {
      throw new DuplicateNamespaceError(namespace.name);
    }
    const timestamp = this.now();
    namespace.stamp(timestamp, timestamp);
    for (const entry of namespace.listEntries()) {
      entry.stamp(timestamp, timestamp);
    }
    this.store.set(namespace.name, namespace.clone());
  }

  async save(namespace: Namespace): Promise<void> {
    this.stampForWrite(namespace);
    this.store.set(namespace.name, namespace.clone());
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
    namespace.stamp(namespace.createdAt, this.now());
    this.store.delete(currentName);
    this.store.set(newName, namespace);
  }

  async importNamespaces(namespaces: Namespace[]): Promise<void> {
    for (const namespace of namespaces) {
      this.stampForWrite(namespace);
      this.store.set(namespace.name, namespace.clone());
    }
  }

  /**
   * Stamps a namespace being upserted: preserves `createdAt` from the prior
   * stored version, refreshes the namespace `modifiedAt`, and for each entry
   * preserves `createdAt` while only refreshing `modifiedAt` for new or changed
   * entries. Unchanged entries keep their stored timestamps.
   *
   * Entries are matched to their prior stored row by name. An entry with no
   * prior row under its name is either brand-new or a renamed entry: a renamed
   * entry carries a preserved `createdAt` that differs from its `modifiedAt`
   * (the domain copies the original creation time on update), so that
   * `createdAt` is kept; a brand-new entry (`createdAt === modifiedAt`) is
   * stamped fresh.
   */
  private stampForWrite(namespace: Namespace): void {
    const timestamp = this.now();
    const previous = this.store.get(namespace.name);
    const previousEntries = new Map(
      (previous?.listEntries() ?? []).map((entry) => [entry.name, entry]),
    );
    for (const entry of namespace.listEntries()) {
      const prior = previousEntries.get(entry.name);
      if (prior && prior.value === entry.value) {
        entry.stamp(prior.createdAt, prior.modifiedAt);
      } else if (prior) {
        entry.stamp(prior.createdAt, timestamp);
      } else if (entry.createdAt !== entry.modifiedAt) {
        entry.stamp(entry.createdAt, timestamp);
      } else {
        entry.stamp(timestamp, timestamp);
      }
    }
    namespace.stamp(previous ? previous.createdAt : timestamp, timestamp);
  }
}
