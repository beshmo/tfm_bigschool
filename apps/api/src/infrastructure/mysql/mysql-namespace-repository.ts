import type { NamespaceRepository, NamespaceSummary, PageResult } from '@okvns/application';
import {
  DuplicateEntryError,
  DuplicateNamespaceError,
  Entry,
  Namespace,
  NamespaceNotFoundError,
} from '@okvns/domain';
import {
  totalPages,
  type EntryListQuery,
  type EntrySortField,
  type NamespaceListQuery,
  type NamespaceSortField,
} from '@okvns/shared';
import type { Pool, PoolConnection, ResultSetHeader, RowDataPacket } from 'mysql2/promise';

const NAMESPACE_UNIQUE_KEY = 'uq_namespaces_name';
const ENTRY_UNIQUE_KEY = 'uq_entries_namespace_name';

/** Sort fields are mapped to fixed column names; user input never reaches the SQL text. */
export const NAMESPACE_SORT_COLUMNS: Record<NamespaceSortField, string> = {
  name: 'name',
  created_at: 'created_at',
  modified_at: 'updated_at',
};
export const ENTRY_SORT_COLUMNS: Record<EntrySortField, string> = {
  name: 'entry_name',
  created_at: 'created_at',
  modified_at: 'updated_at',
  env_dependent: 'env_dependent',
};

/** Escapes `%`, `_` and the escape character so a name filter is matched literally. */
export function escapeLike(text: string): string {
  return text.replace(/[!%_]/g, (char) => `!${char}`);
}

interface NamespaceRow extends RowDataPacket {
  id: number;
  name: string;
  description: string | null;
  created_at: Date;
  updated_at: Date;
}

interface EntryRow extends RowDataPacket {
  id: number;
  namespace_id: number;
  entry_name: string;
  value: string;
  description: string | null;
  env_dependent: number;
  created_at: Date;
  updated_at: Date;
}

function isDuplicateKey(error: unknown, key: string): boolean {
  const failure = error as { code?: string; errno?: number; sqlMessage?: string } | null;
  return (
    (failure?.code === 'ER_DUP_ENTRY' || failure?.errno === 1062) &&
    (failure.sqlMessage ?? '').includes(key)
  );
}

function toEntry(row: EntryRow): Entry {
  return Entry.create({
    name: row.entry_name,
    value: row.value,
    description: row.description ?? undefined,
    envDependent: Boolean(row.env_dependent),
    createdAt: row.created_at,
    modifiedAt: row.updated_at,
  });
}

function toNamespace(row: NamespaceRow, entries: EntryRow[]): Namespace {
  return Namespace.create({
    name: row.name,
    description: row.description ?? undefined,
    entries: entries.map(toEntry),
    createdAt: row.created_at,
    modifiedAt: row.updated_at,
  });
}

/**
 * MySQL `NamespaceRepository`. Every multi-step mutation runs in one
 * transaction, name uniqueness is enforced by the database, and timestamps are
 * owned by the `created_at` / `updated_at` columns.
 */
export class MysqlNamespaceRepository implements NamespaceRepository {
  constructor(private readonly pool: Pool) {}

  async create(namespace: Namespace): Promise<Namespace> {
    return this.transaction(async (connection) => {
      const id = await this.insertNamespace(connection, namespace.name, namespace.description);
      await this.syncEntries(connection, id, namespace.entries);
      return this.load(connection, id);
    });
  }

  async findByName(name: string): Promise<Namespace | undefined> {
    const [rows] = await this.pool.query<NamespaceRow[]>(
      'SELECT id, name, description, created_at, updated_at FROM namespaces WHERE name = ?',
      [name],
    );
    return rows[0] ? this.load(this.pool, rows[0].id) : undefined;
  }

  async save(namespace: Namespace): Promise<Namespace> {
    return this.transaction(async (connection) => {
      const row = await this.lock(connection, namespace.name);
      return this.persist(connection, row, namespace);
    });
  }

  async rename(currentName: string, updated: Namespace): Promise<Namespace> {
    return this.transaction(async (connection) => {
      const row = await this.lock(connection, currentName);
      return this.persist(connection, row, updated);
    });
  }

  async delete(name: string): Promise<boolean> {
    const [result] = await this.pool.query<ResultSetHeader>(
      'DELETE FROM namespaces WHERE name = ?',
      [name],
    );
    return result.affectedRows > 0;
  }

  async listNamespaces(query: NamespaceListQuery): Promise<PageResult<NamespaceSummary>> {
    const { where, params } = this.nameFilter('name', query.name);
    const [counts] = await this.pool.query<RowDataPacket[]>(
      `SELECT COUNT(*) AS total FROM namespaces ${where}`,
      params,
    );
    const total = Number(counts[0]?.total ?? 0);
    const column = NAMESPACE_SORT_COLUMNS[query.sort];
    const direction = query.direction === 'desc' ? 'DESC' : 'ASC';
    const [rows] = await this.pool.query<NamespaceRow[]>(
      `SELECT name, description, created_at, updated_at FROM namespaces ${where}
       ORDER BY ${column} ${direction}, name ASC LIMIT ? OFFSET ?`,
      [...params, query.pageSize, (query.page - 1) * query.pageSize],
    );
    return {
      items: rows.map((row) => {
        const summary: NamespaceSummary = {
          name: row.name,
          createdAt: row.created_at,
          modifiedAt: row.updated_at,
        };
        if (row.description !== null) {
          summary.description = row.description;
        }
        return summary;
      }),
      page: query.page,
      pageSize: query.pageSize,
      totalItems: total,
      totalPages: totalPages(total, query.pageSize),
    };
  }

  async listEntries(
    namespaceName: string,
    query: EntryListQuery,
  ): Promise<PageResult<Entry> | undefined> {
    const [namespaces] = await this.pool.query<NamespaceRow[]>(
      'SELECT id FROM namespaces WHERE name = ?',
      [namespaceName],
    );
    const namespaceId = namespaces[0]?.id;
    if (namespaceId === undefined) {
      return undefined;
    }
    const filter = this.nameFilter('entry_name', query.name);
    const conditions = ['namespace_id = ?', ...(filter.condition ? [filter.condition] : [])];
    const params: unknown[] = [namespaceId, ...filter.params];
    if (query.envDependent !== undefined) {
      conditions.push('env_dependent = ?');
      params.push(query.envDependent ? 1 : 0);
    }
    const where = `WHERE ${conditions.join(' AND ')}`;
    const [counts] = await this.pool.query<RowDataPacket[]>(
      `SELECT COUNT(*) AS total FROM entries ${where}`,
      params,
    );
    const total = Number(counts[0]?.total ?? 0);
    const column = ENTRY_SORT_COLUMNS[query.sort];
    const direction = query.direction === 'desc' ? 'DESC' : 'ASC';
    const [rows] = await this.pool.query<EntryRow[]>(
      `SELECT id, namespace_id, entry_name, \`value\`, description, env_dependent, created_at, updated_at
       FROM entries ${where} ORDER BY ${column} ${direction}, entry_name ASC LIMIT ? OFFSET ?`,
      [...params, query.pageSize, (query.page - 1) * query.pageSize],
    );
    return {
      items: rows.map(toEntry),
      page: query.page,
      pageSize: query.pageSize,
      totalItems: total,
      totalPages: totalPages(total, query.pageSize),
    };
  }

  async listAll(): Promise<Namespace[]> {
    const [namespaces] = await this.pool.query<NamespaceRow[]>(
      'SELECT id, name, description, created_at, updated_at FROM namespaces ORDER BY name ASC',
    );
    const [entries] = await this.pool.query<EntryRow[]>(
      `SELECT id, namespace_id, entry_name, \`value\`, description, env_dependent, created_at, updated_at
       FROM entries ORDER BY namespace_id ASC, entry_name ASC`,
    );
    return namespaces.map((row) =>
      toNamespace(
        row,
        entries.filter((entry) => entry.namespace_id === row.id),
      ),
    );
  }

  async importNamespaces(namespaces: readonly Namespace[]): Promise<Namespace[]> {
    return this.transaction(async (connection) => {
      const ids: number[] = [];
      for (const incoming of namespaces) {
        const [existing] = await connection.query<NamespaceRow[]>(
          'SELECT id, name, description, created_at, updated_at FROM namespaces WHERE name = ? FOR UPDATE',
          [incoming.name],
        );
        if (existing[0]) {
          const target = Namespace.create({
            name: incoming.name,
            description: incoming.description ?? existing[0].description ?? undefined,
            entries: incoming.entries,
          });
          await this.persist(connection, existing[0], target);
          ids.push(existing[0].id);
        } else {
          const id = await this.insertNamespace(connection, incoming.name, incoming.description);
          await this.syncEntries(connection, id, incoming.entries);
          ids.push(id);
        }
      }
      const result: Namespace[] = [];
      for (const id of ids) {
        result.push(await this.load(connection, id));
      }
      return result;
    });
  }

  private nameFilter(column: string, filter: string | undefined) {
    if (filter === undefined || filter === '') {
      return { where: '', condition: undefined, params: [] as unknown[] };
    }
    const condition = `LOWER(${column}) LIKE LOWER(?) ESCAPE '!'`;
    return {
      where: `WHERE ${condition}`,
      condition,
      params: [`%${escapeLike(filter)}%`] as unknown[],
    };
  }

  private async transaction<T>(work: (connection: PoolConnection) => Promise<T>): Promise<T> {
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

  private async lock(connection: PoolConnection, name: string): Promise<NamespaceRow> {
    const [rows] = await connection.query<NamespaceRow[]>(
      'SELECT id, name, description, created_at, updated_at FROM namespaces WHERE name = ? FOR UPDATE',
      [name],
    );
    if (!rows[0]) {
      throw new NamespaceNotFoundError(name);
    }
    return rows[0];
  }

  private async insertNamespace(
    connection: PoolConnection,
    name: string,
    description: string | undefined,
  ): Promise<number> {
    try {
      const [result] = await connection.query<ResultSetHeader>(
        'INSERT INTO namespaces (name, description) VALUES (?, ?)',
        [name, description ?? null],
      );
      return result.insertId;
    } catch (error) {
      throw isDuplicateKey(error, NAMESPACE_UNIQUE_KEY) ? new DuplicateNamespaceError(name) : error;
    }
  }

  /** Writes the desired state of an existing namespace, touching `updated_at` only on a real change. */
  private async persist(
    connection: PoolConnection,
    row: NamespaceRow,
    desired: Namespace,
  ): Promise<Namespace> {
    const entriesChanged = await this.syncEntries(connection, row.id, desired.entries);
    const namespaceChanged =
      row.name !== desired.name || (row.description ?? undefined) !== desired.description;
    if (namespaceChanged || entriesChanged) {
      try {
        await connection.query(
          'UPDATE namespaces SET name = ?, description = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?',
          [desired.name, desired.description ?? null, row.id],
        );
      } catch (error) {
        throw isDuplicateKey(error, NAMESPACE_UNIQUE_KEY)
          ? new DuplicateNamespaceError(desired.name)
          : error;
      }
    }
    return this.load(connection, row.id);
  }

  /** Makes a namespace's stored entries equal `entries`; resolves whether anything changed. */
  private async syncEntries(
    connection: PoolConnection,
    namespaceId: number,
    entries: readonly Entry[],
  ): Promise<boolean> {
    const [stored] = await connection.query<EntryRow[]>(
      `SELECT id, namespace_id, entry_name, \`value\`, description, env_dependent, created_at, updated_at
       FROM entries WHERE namespace_id = ? FOR UPDATE`,
      [namespaceId],
    );
    const wanted = new Set(entries.map((entry) => entry.name));
    const stale = stored.filter((row) => !wanted.has(row.entry_name)).map((row) => row.id);
    if (stale.length > 0) {
      await connection.query('DELETE FROM entries WHERE id IN (?)', [stale]);
    }

    let changed = stale.length > 0;
    const byName = new Map(stored.map((row) => [row.entry_name, row]));
    for (const entry of entries) {
      const row = byName.get(entry.name);
      if (row) {
        if (!toEntry(row).hasSameContent(entry)) {
          await connection.query(
            'UPDATE entries SET `value` = ?, description = ?, env_dependent = ? WHERE id = ?',
            [entry.value, entry.description ?? null, entry.envDependent ? 1 : 0, row.id],
          );
          changed = true;
        }
        continue;
      }
      try {
        await connection.query(
          `INSERT INTO entries (namespace_id, entry_name, \`value\`, description, env_dependent, created_at)
           VALUES (?, ?, ?, ?, ?, COALESCE(?, CURRENT_TIMESTAMP))`,
          [
            namespaceId,
            entry.name,
            entry.value,
            entry.description ?? null,
            entry.envDependent ? 1 : 0,
            entry.createdAt ?? null,
          ],
        );
      } catch (error) {
        throw isDuplicateKey(error, ENTRY_UNIQUE_KEY) ? new DuplicateEntryError(entry.name) : error;
      }
      changed = true;
    }
    return changed;
  }

  private async load(executor: Pool | PoolConnection, id: number): Promise<Namespace> {
    const [namespaces] = await executor.query<NamespaceRow[]>(
      'SELECT id, name, description, created_at, updated_at FROM namespaces WHERE id = ?',
      [id],
    );
    const [entries] = await executor.query<EntryRow[]>(
      `SELECT id, namespace_id, entry_name, \`value\`, description, env_dependent, created_at, updated_at
       FROM entries WHERE namespace_id = ? ORDER BY entry_name ASC`,
      [id],
    );
    return toNamespace(namespaces[0] as NamespaceRow, entries);
  }
}
