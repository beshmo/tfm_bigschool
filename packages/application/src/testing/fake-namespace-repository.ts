import type { Namespace } from '@okvns/domain';
import type { NamespaceRepository } from '../ports.js';

/** In-memory test double mirroring the production in-memory adapter semantics. */
export class FakeNamespaceRepository implements NamespaceRepository {
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
