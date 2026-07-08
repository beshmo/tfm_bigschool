import type { Namespace } from '@okvns/domain';

/**
 * Persistence port for namespaces. Implemented by infrastructure adapters
 * (initially an in-memory store). Use cases depend only on this interface.
 *
 * Namespaces are keyed by their normalized name. `save` performs an upsert.
 */
export interface NamespaceRepository {
  /** Returns all stored namespaces in no guaranteed order. */
  list(): Promise<Namespace[]>;

  /** Returns the namespace with the given name, or null if absent. */
  findByName(name: string): Promise<Namespace | null>;

  /** Returns whether a namespace with the given name exists. */
  existsByName(name: string): Promise<boolean>;

  /** Inserts or replaces the namespace keyed by its current name. */
  save(namespace: Namespace): Promise<void>;

  /** Deletes the namespace with the given name; returns true if one was removed. */
  delete(name: string): Promise<boolean>;
}
