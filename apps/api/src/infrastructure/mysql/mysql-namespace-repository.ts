import type { NamespaceRepository } from '@okvns/application';
import { DuplicateNamespaceError, Entry, Namespace, NamespaceNotFoundError } from '@okvns/domain';
import type { Pool, PoolConnection, ResultSetHeader, RowDataPacket } from 'mysql2/promise';

interface NamespaceRow extends RowDataPacket {
  id: number;
  name: string;
  created_at: Date | string;
  modified_at: Date | string;
}

interface EntryRow extends RowDataPacket {
  namespace_id: number;
  entry_name: string;
  value: string;
  created_at: Date | string;
  modified_at: Date | string;
}

interface EntryValueRow extends RowDataPacket {
  entry_name: string;
  value: string;
}

interface TimestampRow extends RowDataPacket {
  entry_name?: string;
  created_at: Date | string;
  updated_at: Date | string;
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
      'SELECT id, name, created_at, updated_at AS modified_at FROM namespaces ORDER BY name',
    );
    if (namespaceRows.length === 0) {
      return [];
    }
    const ids = namespaceRows.map((row) => row.id);
    const [entryRows] = await this.pool.query<EntryRow[]>(
      'SELECT namespace_id, entry_name, value, created_at, updated_at AS modified_at FROM entries WHERE namespace_id IN (?) ORDER BY entry_name',
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

  async findByName(name: string): Promise<Namespace | null> {
    const [namespaceRows] = await this.pool.query<NamespaceRow[]>(
      'SELECT id, name, created_at, updated_at AS modified_at FROM namespaces WHERE name = ?',
      [name],
    );
    if (namespaceRows.length === 0) {
      return null;
    }
    const namespaceRow = namespaceRows[0];
    const [entryRows] = await this.pool.query<EntryRow[]>(
      'SELECT namespace_id, entry_name, value, created_at, updated_at AS modified_at FROM entries WHERE namespace_id = ? ORDER BY entry_name',
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
          'INSERT INTO namespaces (name) VALUES (?)',
          [namespace.name],
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
      'INSERT INTO namespaces (name) VALUES (?) ON DUPLICATE KEY UPDATE id = LAST_INSERT_ID(id), updated_at = CURRENT_TIMESTAMP',
      [namespace.name],
    );
    const namespaceId = result.insertId;

    const [existingRows] = await connection.query<EntryValueRow[]>(
      'SELECT entry_name, value FROM entries WHERE namespace_id = ?',
      [namespaceId],
    );
    const existing = new Map(existingRows.map((row) => [row.entry_name, row.value]));
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
      if (!existing.has(entry.name)) {
        // A renamed entry has no prior row under its new name but carries a
        // preserved creation time (distinct from its modification time). Keep
        // that `created_at` so a rename does not reset it; brand-new entries
        // (createdAt === modifiedAt) fall back to the column default.
        if (entry.createdAt !== entry.modifiedAt) {
          await connection.query(
            'INSERT INTO entries (namespace_id, entry_name, value, created_at) VALUES (?, ?, ?, ?)',
            [namespaceId, entry.name, entry.value, new Date(entry.createdAt)],
          );
        } else {
          await connection.query(
            'INSERT INTO entries (namespace_id, entry_name, value) VALUES (?, ?, ?)',
            [namespaceId, entry.name, entry.value],
          );
        }
      } else if (existing.get(entry.name) !== entry.value) {
        await connection.query(
          'UPDATE entries SET value = ? WHERE namespace_id = ? AND entry_name = ?',
          [entry.value, namespaceId, entry.name],
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
    const values = entries.map((entry) => [namespaceId, entry.name, entry.value]);
    await connection.query('INSERT INTO entries (namespace_id, entry_name, value) VALUES ?', [
      values,
    ]);
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

  /** Reconstructs a domain aggregate from stored rows, preserving timestamps. */
  private toNamespace(namespaceRow: NamespaceRow, entryRows: EntryRow[]): Namespace {
    const entries = entryRows.map((row) =>
      Entry.rehydrate(row.entry_name, row.value, toIso(row.created_at), toIso(row.modified_at)),
    );
    return Namespace.rehydrate(
      namespaceRow.name,
      toIso(namespaceRow.created_at),
      toIso(namespaceRow.modified_at),
      entries,
    );
  }
}
