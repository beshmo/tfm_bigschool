import type { NamespaceRepository } from '@okvns/application';
import { DuplicateNamespaceError, Entry, Namespace, NamespaceNotFoundError } from '@okvns/domain';
import type { Pool, PoolConnection, ResultSetHeader, RowDataPacket } from 'mysql2/promise';

interface NamespaceRow extends RowDataPacket {
  id: number;
  name: string;
}

interface EntryRow extends RowDataPacket {
  namespace_id: number;
  entry_name: string;
  value: string;
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

/**
 * MySQL-backed implementation of the namespace repository port.
 *
 * All persistence types (`mysql2` rows, pools, connections) stay inside this
 * adapter. Rows are mapped into `Namespace`/`Entry` aggregates before crossing
 * back into the application layer, and duplicate-key / missing-row conditions
 * are translated into existing domain errors.
 */
export class MysqlNamespaceRepository implements NamespaceRepository {
  constructor(private readonly pool: Pool) {}

  async list(): Promise<Namespace[]> {
    const [namespaceRows] = await this.pool.query<NamespaceRow[]>(
      'SELECT id, name FROM namespaces ORDER BY name',
    );
    if (namespaceRows.length === 0) {
      return [];
    }
    const ids = namespaceRows.map((row) => row.id);
    const [entryRows] = await this.pool.query<EntryRow[]>(
      'SELECT namespace_id, entry_name, value FROM entries WHERE namespace_id IN (?) ORDER BY entry_name',
      [ids],
    );
    const entriesByNamespaceId = new Map<number, EntryRow[]>();
    for (const row of entryRows) {
      const bucket = entriesByNamespaceId.get(row.namespace_id) ?? [];
      bucket.push(row);
      entriesByNamespaceId.set(row.namespace_id, bucket);
    }
    return namespaceRows.map((row) =>
      this.toNamespace(row.name, entriesByNamespaceId.get(row.id) ?? []),
    );
  }

  async findByName(name: string): Promise<Namespace | null> {
    const [namespaceRows] = await this.pool.query<NamespaceRow[]>(
      'SELECT id, name FROM namespaces WHERE name = ?',
      [name],
    );
    if (namespaceRows.length === 0) {
      return null;
    }
    const { id, name: storedName } = namespaceRows[0];
    const [entryRows] = await this.pool.query<EntryRow[]>(
      'SELECT namespace_id, entry_name, value FROM entries WHERE namespace_id = ? ORDER BY entry_name',
      [id],
    );
    return this.toNamespace(storedName, entryRows);
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

  /** Inserts or updates a namespace by name and replaces its stored entries. */
  private async upsert(connection: PoolConnection, namespace: Namespace): Promise<void> {
    // LAST_INSERT_ID(id) makes `insertId` resolve to the existing row's id on a
    // duplicate-name update, so we can replace entries either way.
    const [result] = await connection.query<ResultSetHeader>(
      'INSERT INTO namespaces (name) VALUES (?) ON DUPLICATE KEY UPDATE id = LAST_INSERT_ID(id)',
      [namespace.name],
    );
    const namespaceId = result.insertId;
    await connection.query('DELETE FROM entries WHERE namespace_id = ?', [namespaceId]);
    await this.insertEntries(connection, namespaceId, namespace);
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

  /** Reconstructs a domain aggregate from stored rows. */
  private toNamespace(name: string, entryRows: EntryRow[]): Namespace {
    const namespace = Namespace.create(name);
    namespace.setEntries(entryRows.map((row) => Entry.create(row.entry_name, row.value)));
    return namespace;
  }
}
