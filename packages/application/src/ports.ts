import type { Namespace } from '@okvns/domain';

/**
 * Persistence port for namespaces. Implemented by infrastructure adapters
 * (an in-memory store for tests/local use and a MySQL adapter for the durable
 * default runtime). Use cases depend only on this interface.
 *
 * Namespaces are keyed by their normalized name. `save` performs an upsert that
 * replaces the namespace's stored entries with its current entries.
 */
export interface NamespaceRepository {
  /** Returns all stored namespaces in no guaranteed order. */
  list(): Promise<Namespace[]>;

  /** Returns the namespace with the given name, or null if absent. */
  findByName(name: string): Promise<Namespace | null>;

  /** Returns whether a namespace with the given name exists. */
  existsByName(name: string): Promise<boolean>;

  /**
   * Inserts a brand-new namespace. Throws `DuplicateNamespaceError` if a
   * namespace with the same name already exists — implementations MUST rely on
   * a storage-level unique constraint so concurrent creates cannot both succeed.
   */
  create(namespace: Namespace): Promise<void>;

  /** Inserts or replaces the namespace keyed by its current name. */
  save(namespace: Namespace): Promise<void>;

  /** Deletes the namespace with the given name; returns true if one was removed. */
  delete(name: string): Promise<boolean>;

  /**
   * Atomically renames a namespace, preserving its entries.
   *
   * Throws `NamespaceNotFoundError` if `currentName` does not exist and
   * `DuplicateNamespaceError` if `newName` is already taken. Implementations
   * MUST perform this as a single transaction so a failure leaves the original
   * namespace and its entries unchanged.
   */
  rename(currentName: string, newName: string): Promise<void>;

  /**
   * Atomically upserts a batch of namespaces (replacing each existing
   * namespace's entries). Implementations MUST apply the whole batch in a single
   * transaction so a mid-batch failure leaves existing storage unchanged.
   */
  importNamespaces(namespaces: Namespace[]): Promise<void>;
}
