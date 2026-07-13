import { Injectable } from '@nestjs/common';
import type { NamespaceRepository } from '@okvns/application';
import { DuplicateNamespaceError, NamespaceNotFoundError, type Namespace } from '@okvns/domain';

/**
 * In-memory implementation of the namespace repository port. State lives only
 * for the lifetime of the process and is intentionally lost on restart. Used by
 * the `memory` storage profile for fast local demos and tests; the durable
 * default runtime uses the MySQL adapter.
 */
@Injectable()
export class InMemoryNamespaceRepository implements NamespaceRepository {
  private readonly store = new Map<string, Namespace>();

  async list(): Promise<Namespace[]> {
    return [...this.store.values()];
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
