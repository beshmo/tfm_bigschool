import type { NamespaceRepository, NamespaceSummary, PageResult } from '@okvns/application';
import { DuplicateNamespaceError, Entry, Namespace, NamespaceNotFoundError } from '@okvns/domain';
import type {
  EntryListQuery,
  EntrySortField,
  NamespaceListQuery,
  NamespaceSortField,
  SortDirection,
} from '@okvns/shared';
import type { Pool, PoolConnection, ResultSetHeader, RowDataPacket } from 'mysql2/promise';

interface NamespaceRow extends RowDataPacket {
  id: number;
  name: string;
  description: string | null;
  created_at: Date | string;
  modified_at: Date | string;
}

interface EntryRow extends RowDataPacket {
  namespace_id: number;
  entry_name: string;
  value: string;
  description: string | null;
  env_dependent: number | boolean;
  created_at: Date | string;
  modified_at: Date | string;
}

interface EntryValueRow extends RowDataPacket {
  entry_name: string;
  value: string;
  description: string | null;
  env_dependent: number | boolean;
}

interface TimestampRow extends RowDataPacket {
  entry_name?: string;
  created_at: Date | string;
  updated_at: Date | string;
}

interface CountRow extends RowDataPacket {
  total: number;
}

/**
 * Sort fields map to fixed column fragments here rather than being interpolated
 * from the request. The application layer only ever passes an allowlisted field,
 * and this table is the second half of that guarantee: an unknown field cannot
 * reach the SQL text.
 */
const NAMESPACE_SORT_COLUMNS: Record<NamespaceSortField, string> = {
  name: 'name',
  created_at: 'created_at',
  modified_at: 'updated_at',
};

const ENTRY_SORT_COLUMNS: Record<EntrySortField, string> = {
  name: 'entry_name',
  created_at: 'created_at',
  modified_at: 'updated_at',
  env_dependent: 'env_dependent',
};

function sqlDirection(direction: SortDirection): 'ASC' | 'DESC' {
  return direction === 'desc' ? 'DESC' : 'ASC';
}

/**
 * Builds the `ORDER BY` for a list query. Ties on the primary field always break
 * on ascending name so a page boundary cannot split rows that compare equal —
 * the same rule the in-memory adapter applies.
 */
function orderBy(column: string, nameColumn: string, direction: SortDirection): string {
  const primary = `${column} ${sqlDirection(direction)}`;
  return column === nameColumn ? primary : `${primary}, ${nameColumn} ASC`;
}

/**
 * Builds a case-insensitive "contains" LIKE pattern.
 *
 * Both sides are lowercased in SQL rather than relying on the column's collation
 * being case-insensitive, so filtering behaves identically to the in-memory
 * adapter no matter how the schema is collated. The filter's own `%`, `_`, and
 * `\` are escaped so a user's literal text cannot act as a wildcard.
 */
function containsPattern(filter: string): string {
  const escaped = filter.toLowerCase().replace(/[\\%_]/g, (char) => `\\${char}`);
  return `%${escaped}%`;
}

/** MySQL error code raised when a unique constraint is violated. */
const DUPLICATE_KEY = 'ER_DUP_ENTRY';

function isDuplicateKeyError(error: unknown): boolean {
  return (
    typeof error === 'object' &&
    error !== null &&
    (error as { code?: string }).code === DUPLICATE_KEY
  );
}

/** Normalizes a MySQL `TIMESTAMP` value (Date or string) to an ISO 8601 string. */
function toIso(value: Date | string): string {
  return value instanceof Date ? value.toISOString() : new Date(value).toISOString();
}

/** Maps an absent domain description to a storable SQL NULL. */
function toColumn(description: string | undefined): string | null {
  return description ?? null;
}

/** Maps a nullable description column back to the domain's optional field. */
function fromColumn(description: string | null): string | undefined {
  return description ?? undefined;
}

/**
 * Maps the `env_dependent` column to a domain boolean. MySQL's BOOLEAN is a
 * TINYINT(1), so the driver hands back 0/1 rather than a JavaScript boolean.
 */
function fromBoolColumn(value: number | boolean): boolean {
  return Boolean(value);
}

/**
 * MySQL-backed implementation of the namespace repository port.
 *
 * All persistence types (`mysql2` rows, pools, connections) stay inside this
 * adapter. Rows are mapped into `Namespace`/`Entry` aggregates before crossing
 * back into the application layer, and duplicate-key / missing-row conditions
 * are translated into existing domain errors.
 *
 * Timestamps use the existing `created_at`/`updated_at` columns; reads map
 * `updated_at` to the public `modified_at`. Saves preserve entry `created_at`
 * across value updates (rows are updated, not deleted and reinserted) and touch
 * the owning namespace row so its `updated_at` reflects aggregate freshness.
 */
export class MysqlNamespaceRepository implements NamespaceRepository {
  constructor(private readonly pool: Pool) {}

  async list(): Promise<Namespace[]> {
    const [namespaceRows] = await this.pool.query<NamespaceRow[]>(
      'SELECT id, name, description, created_at, updated_at AS modified_at FROM namespaces ORDER BY name',
    );
    if (namespaceRows.length === 0) {
      return [];
    }
    const ids = namespaceRows.map((row) => row.id);
    const [entryRows] = await this.pool.query<EntryRow[]>(
      'SELECT namespace_id, entry_name, value, description, env_dependent, created_at, updated_at AS modified_at FROM entries WHERE namespace_id IN (?) ORDER BY entry_name',
      [ids],
    );
    const entriesByNamespaceId = new Map<number, EntryRow[]>();
    for (const row of entryRows) {
      const bucket = entriesByNamespaceId.get(row.namespace_id) ?? [];
      bucket.push(row);
      entriesByNamespaceId.set(row.namespace_id, bucket);
    }
    return namespaceRows.map((row) =>
      this.toNamespace(row, entriesByNamespaceId.get(row.id) ?? []),
    );
  }

  async listPage(query: NamespaceListQuery): Promise<PageResult<NamespaceSummary>> {
    const where = query.name === undefined ? '' : " WHERE LOWER(name) LIKE ? ESCAPE '\\\\'";
    const filterParams = query.name === undefined ? [] : [containsPattern(query.name)];

    const [countRows] = await this.pool.query<CountRow[]>(
      `SELECT COUNT(*) AS total FROM namespaces${where}`,
      filterParams,
    );
    const totalItems = Number(countRows[0].total);

    const order = orderBy(NAMESPACE_SORT_COLUMNS[query.sort], 'name', query.direction);
    const [rows] = await this.pool.query<NamespaceRow[]>(
      `SELECT name, description, created_at, updated_at AS modified_at FROM namespaces${where} ORDER BY ${order} LIMIT ? OFFSET ?`,
      [...filterParams, query.page_size, (query.page - 1) * query.page_size],
    );
    return {
      items: rows.map((row) => ({
        name: row.name,
        description: fromColumn(row.description),
        createdAt: toIso(row.created_at),
        modifiedAt: toIso(row.modified_at),
      })),
      totalItems,
    };
  }

  async listEntriesPage(
    namespaceName: string,
    query: EntryListQuery,
  ): Promise<PageResult<Entry> | null> {
    const [namespaceRows] = await this.pool.query<NamespaceRow[]>(
      'SELECT id FROM namespaces WHERE name = ?',
      [namespaceName],
    );
    if (namespaceRows.length === 0) {
      return null;
    }
    const namespaceId = namespaceRows[0].id;

    const conditions = ['namespace_id = ?'];
    const filterParams: unknown[] = [namespaceId];
    if (query.name !== undefined) {
      conditions.push("LOWER(entry_name) LIKE ? ESCAPE '\\\\'");
      filterParams.push(containsPattern(query.name));
    }
    if (query.env_dependent !== undefined) {
      conditions.push('env_dependent = ?');
      filterParams.push(query.env_dependent);
    }
    const where = ` WHERE ${conditions.join(' AND ')}`;

    const [countRows] = await this.pool.query<CountRow[]>(
      `SELECT COUNT(*) AS total FROM entries${where}`,
      filterParams,
    );
    const totalItems = Number(countRows[0].total);

    const order = orderBy(ENTRY_SORT_COLUMNS[query.sort], 'entry_name', query.direction);
    const [rows] = await this.pool.query<EntryRow[]>(
      `SELECT namespace_id, entry_name, value, description, env_dependent, created_at, updated_at AS modified_at FROM entries${where} ORDER BY ${order} LIMIT ? OFFSET ?`,
      [...filterParams, query.page_size, (query.page - 1) * query.page_size],
    );
    return { items: rows.map((row) => this.toEntry(row)), totalItems };
  }

  async findByName(name: string): Promise<Namespace | null> {
    const [namespaceRows] = await this.pool.query<NamespaceRow[]>(
      'SELECT id, name, description, created_at, updated_at AS modified_at FROM namespaces WHERE name = ?',
      [name],
    );
    if (namespaceRows.length === 0) {
      return null;
    }
    const namespaceRow = namespaceRows[0];
    const [entryRows] = await this.pool.query<EntryRow[]>(
      'SELECT namespace_id, entry_name, value, description, env_dependent, created_at, updated_at AS modified_at FROM entries WHERE namespace_id = ? ORDER BY entry_name',
      [namespaceRow.id],
    );
    return this.toNamespace(namespaceRow, entryRows);
  }

  async existsByName(name: string): Promise<boolean> {
    const [rows] = await this.pool.query<RowDataPacket[]>(
      'SELECT 1 FROM namespaces WHERE name = ? LIMIT 1',
      [name],
    );
    return rows.length > 0;
  }

  async create(namespace: Namespace): Promise<void> {
    await this.withTransaction(async (connection) => {
      let namespaceId: number;
      try {
        const [result] = await connection.query<ResultSetHeader>(
          'INSERT INTO namespaces (name, description) VALUES (?, ?)',
          [namespace.name, toColumn(namespace.description)],
        );
        namespaceId = result.insertId;
      } catch (error) {
        if (isDuplicateKeyError(error)) {
          throw new DuplicateNamespaceError(namespace.name);
        }
        throw error;
      }
      await this.insertEntries(connection, namespaceId, namespace);
      await this.stampFromDb(connection, namespaceId, namespace);
    });
  }

  async save(namespace: Namespace): Promise<void> {
    await this.withTransaction((connection) => this.upsert(connection, namespace));
  }

  async delete(name: string): Promise<boolean> {
    const [result] = await this.pool.query<ResultSetHeader>(
      'DELETE FROM namespaces WHERE name = ?',
      [name],
    );
    return result.affectedRows > 0;
  }

  async rename(currentName: string, newName: string): Promise<void> {
    await this.withTransaction(async (connection) => {
      const [rows] = await connection.query<NamespaceRow[]>(
        'SELECT id FROM namespaces WHERE name = ? FOR UPDATE',
        [currentName],
      );
      if (rows.length === 0) {
        throw new NamespaceNotFoundError(currentName);
      }
      try {
        await connection.query('UPDATE namespaces SET name = ? WHERE name = ?', [
          newName,
          currentName,
        ]);
      } catch (error) {
        if (isDuplicateKeyError(error)) {
          throw new DuplicateNamespaceError(newName);
        }
        throw error;
      }
    });
  }

  async importNamespaces(namespaces: Namespace[]): Promise<void> {
    await this.withTransaction(async (connection) => {
      for (const namespace of namespaces) {
        await this.upsert(connection, namespace);
      }
    });
  }

  /**
   * Inserts or updates a namespace by name and reconciles its stored entries:
   * new entries are inserted, changed entries are updated (which refreshes their
   * `updated_at`), unchanged entries are left untouched, and removed entries are
   * deleted. The namespace row's `updated_at` is bumped so it reflects the
   * aggregate change. This preserves entry `created_at` across value updates.
   */
  private async upsert(connection: PoolConnection, namespace: Namespace): Promise<void> {
    // LAST_INSERT_ID(id) makes `insertId` resolve to the existing row's id on a
    // duplicate-name update; the explicit updated_at bump keeps the namespace's
    // modification timestamp fresh even when only entries change.
    const [result] = await connection.query<ResultSetHeader>(
      'INSERT INTO namespaces (name, description) VALUES (?, ?) ON DUPLICATE KEY UPDATE id = LAST_INSERT_ID(id), description = VALUES(description), updated_at = CURRENT_TIMESTAMP',
      [namespace.name, toColumn(namespace.description)],
    );
    const namespaceId = result.insertId;

    const [existingRows] = await connection.query<EntryValueRow[]>(
      'SELECT entry_name, value, description, env_dependent FROM entries WHERE namespace_id = ?',
      [namespaceId],
    );
    const existing = new Map(existingRows.map((row) => [row.entry_name, row]));
    const desired = namespace.listEntries();
    const desiredNames = new Set(desired.map((entry) => entry.name));

    const removed = [...existing.keys()].filter((name) => !desiredNames.has(name));
    if (removed.length > 0) {
      await connection.query('DELETE FROM entries WHERE namespace_id = ? AND entry_name IN (?)', [
        namespaceId,
        removed,
      ]);
    }

    for (const entry of desired) {
      const prior = existing.get(entry.name);
      if (!prior) {
        // A renamed entry has no prior row under its new name but carries a
        // preserved creation time (distinct from its modification time). Keep
        // that `created_at` so a rename does not reset it; brand-new entries
        // (createdAt === modifiedAt) fall back to the column default.
        if (entry.createdAt !== entry.modifiedAt) {
          await connection.query(
            'INSERT INTO entries (namespace_id, entry_name, value, description, env_dependent, created_at) VALUES (?, ?, ?, ?, ?, ?)',
            [
              namespaceId,
              entry.name,
              entry.value,
              toColumn(entry.description),
              entry.envDependent,
              new Date(entry.createdAt),
            ],
          );
        } else {
          await connection.query(
            'INSERT INTO entries (namespace_id, entry_name, value, description, env_dependent) VALUES (?, ?, ?, ?, ?)',
            [namespaceId, entry.name, entry.value, toColumn(entry.description), entry.envDependent],
          );
        }
      } else if (
        prior.value !== entry.value ||
        fromColumn(prior.description) !== entry.description ||
        fromBoolColumn(prior.env_dependent) !== entry.envDependent
      ) {
        // A description- or env_dependent-only change is still a change:
        // updating the row refreshes `updated_at` so `modified_at` reflects it.
        await connection.query(
          'UPDATE entries SET value = ?, description = ?, env_dependent = ? WHERE namespace_id = ? AND entry_name = ?',
          [entry.value, toColumn(entry.description), entry.envDependent, namespaceId, entry.name],
        );
      }
    }

    await this.stampFromDb(connection, namespaceId, namespace);
  }

  private async insertEntries(
    connection: PoolConnection,
    namespaceId: number,
    namespace: Namespace,
  ): Promise<void> {
    const entries = namespace.listEntries();
    if (entries.length === 0) {
      return;
    }
    const values = entries.map((entry) => [
      namespaceId,
      entry.name,
      entry.value,
      toColumn(entry.description),
      entry.envDependent,
    ]);
    await connection.query(
      'INSERT INTO entries (namespace_id, entry_name, value, description, env_dependent) VALUES ?',
      [values],
    );
  }

  /**
   * Reads the storage-assigned timestamps back from the just-written rows and
   * stamps them onto the domain aggregate, so responses reflect the durable
   * `created_at`/`updated_at` values rather than app-side placeholders.
   */
  private async stampFromDb(
    connection: PoolConnection,
    namespaceId: number,
    namespace: Namespace,
  ): Promise<void> {
    const [namespaceRows] = await connection.query<TimestampRow[]>(
      'SELECT created_at, updated_at FROM namespaces WHERE id = ?',
      [namespaceId],
    );
    const namespaceRow = namespaceRows[0];
    namespace.stamp(toIso(namespaceRow.created_at), toIso(namespaceRow.updated_at));

    const [entryRows] = await connection.query<TimestampRow[]>(
      'SELECT entry_name, created_at, updated_at FROM entries WHERE namespace_id = ?',
      [namespaceId],
    );
    const byName = new Map(entryRows.map((row) => [row.entry_name, row]));
    for (const entry of namespace.listEntries()) {
      const row = byName.get(entry.name);
      if (row) {
        entry.stamp(toIso(row.created_at), toIso(row.updated_at));
      }
    }
  }

  private async withTransaction<T>(work: (connection: PoolConnection) => Promise<T>): Promise<T> {
    const connection = await this.pool.getConnection();
    try {
      await connection.beginTransaction();
      const result = await work(connection);
      await connection.commit();
      return result;
    } catch (error) {
      await connection.rollback();
      throw error;
    } finally {
      connection.release();
    }
  }

  /** Reconstructs a domain entry from a stored row, preserving timestamps. */
  private toEntry(row: EntryRow): Entry {
    return Entry.rehydrate(
      row.entry_name,
      row.value,
      toIso(row.created_at),
      toIso(row.modified_at),
      fromColumn(row.description),
      fromBoolColumn(row.env_dependent),
    );
  }

  /** Reconstructs a domain aggregate from stored rows, preserving timestamps. */
  private toNamespace(namespaceRow: NamespaceRow, entryRows: EntryRow[]): Namespace {
    const entries = entryRows.map((row) => this.toEntry(row));
    return Namespace.rehydrate(
      namespaceRow.name,
      toIso(namespaceRow.created_at),
      toIso(namespaceRow.modified_at),
      entries,
      fromColumn(namespaceRow.description),
    );
  }
}
