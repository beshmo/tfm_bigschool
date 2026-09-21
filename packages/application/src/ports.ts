import type { Entry, Namespace } from '@okvns/domain';
import type { EntryListQuery, NamespaceListQuery } from '@okvns/shared';

/** A lightweight namespace row for list pages (no entries). */
export interface NamespaceSummary {
  name: string;
  description?: string;
  createdAt?: Date;
  modifiedAt?: Date;
}

export interface PageResult<T> {
  items: T[];
  page: number;
  pageSize: number;
  totalItems: number;
  totalPages: number;
}

/**
 * Persistence port for namespace aggregates. Implementations own timestamps
 * (`createdAt`/`modifiedAt`) and must make multi-step mutations atomic.
 */
export interface NamespaceRepository {
  /** Inserts a new namespace; rejects with `DuplicateNamespaceError` when the name is taken. */
  create(namespace: Namespace): Promise<Namespace>;

  findByName(name: string): Promise<Namespace | undefined>;

  /**
   * Persists the new state of an existing namespace (description and entries).
   * Rejects with `NamespaceNotFoundError` when it does not exist.
   */
  save(namespace: Namespace): Promise<Namespace>;

  /**
   * Atomically renames `currentName` to `updated.name` and stores its other state.
   * Rejects with `NamespaceNotFoundError` or `DuplicateNamespaceError`, leaving
   * everything unchanged on failure.
   */
  rename(currentName: string, updated: Namespace): Promise<Namespace>;

  /** Resolves `true` when a namespace was deleted, `false` when it did not exist. */
  delete(name: string): Promise<boolean>;

  listNamespaces(query: NamespaceListQuery): Promise<PageResult<NamespaceSummary>>;

  /** Resolves `undefined` when the namespace does not exist. */
  listEntries(namespaceName: string, query: EntryListQuery): Promise<PageResult<Entry> | undefined>;

  /** Every namespace with its entries, sorted by name. */
  listAll(): Promise<Namespace[]>;

  /**
   * Atomically upserts namespaces by name: missing ones are created, existing
   * ones have their entries fully replaced (and their description updated when
   * one is supplied). Either all changes are committed or none.
   */
  importNamespaces(namespaces: readonly Namespace[]): Promise<Namespace[]>;
}
