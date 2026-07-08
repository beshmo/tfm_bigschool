import { Injectable } from '@nestjs/common';
import type { NamespaceRepository } from '@okvns/application';
import type { Namespace } from '@okvns/domain';

/**
 * In-memory implementation of the namespace repository port. State lives only
 * for the lifetime of the process and is intentionally lost on restart.
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

  async save(namespace: Namespace): Promise<void> {
    this.store.set(namespace.name, namespace);
  }

  async delete(name: string): Promise<boolean> {
    return this.store.delete(name);
  }
}
