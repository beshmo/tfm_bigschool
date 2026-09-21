import {
  DuplicateEntryError,
  DuplicateNamespaceError,
  Entry,
  Namespace,
  NamespaceNotFoundError,
} from '@okvns/domain';
import type { EntryListQuery, NamespaceListQuery } from '@okvns/shared';
import type { Pool } from 'mysql2/promise';
import { describe, expect, it, vi } from 'vitest';
import { MysqlDatabase } from './mysql-database';
import {
  ENTRY_SORT_COLUMNS,
  MysqlNamespaceRepository,
  NAMESPACE_SORT_COLUMNS,
  escapeLike,
} from './mysql-namespace-repository';
import { MysqlReadinessIndicator } from './mysql-readiness';
import { createPersistence } from '../persistence.module';

/**
 * These tests drive the adapter through a scripted fake pool: they verify the
 * transaction flow, error translation and that SQL is built from allowlists.
 * Behaviour against a real database is covered by the gated integration suite.
 */
type Call = { sql: string; params: unknown[] };
type Reply = unknown[] | Record<string, unknown> | Error | undefined;
type Script = (sql: string, params: unknown[]) => Reply;

function fakePool(script: Script) {
  const calls: Call[] = [];
  const events: string[] = [];
  const query = vi.fn(async (sql: string, params: unknown[] = []) => {
    calls.push({ sql: sql.replace(/\s+/g, ' ').trim(), params });
    const reply = script(sql, params);
    if (reply instanceof Error) throw reply;
    return [reply ?? [], []];
  });
  const connection = {
    query,
    beginTransaction: vi.fn(async () => void events.push('begin')),
    commit: vi.fn(async () => void events.push('commit')),
    rollback: vi.fn(async () => void events.push('rollback')),
    release: vi.fn(() => void events.push('release')),
  };
  const pool = { query, getConnection: vi.fn(async () => connection) };
  return { pool: pool as unknown as Pool, calls, events };
}

const T0 = new Date('2026-01-01T00:00:00Z');
const nsRow = (id: number, name: string, description: string | null = null) => ({
  id,
  name,
  description,
  created_at: T0,
  updated_at: T0,
});
const entryRow = (id: number, namespaceId: number, name: string, value = 'v') => ({
  id,
  namespace_id: namespaceId,
  entry_name: name,
  value,
  description: null,
  env_dependent: 0,
  created_at: T0,
  updated_at: T0,
});
const duplicate = (key: string) =>
  Object.assign(new Error('dup'), {
    code: 'ER_DUP_ENTRY',
    errno: 1062,
    sqlMessage: `Duplicate entry 'x' for key '${key}'`,
  });

const has = (sql: string, fragment: string) => sql.includes(fragment);

describe('helpers', () => {
  it('GIVEN filter text WHEN escaped THEN %, _ and the escape character are literal', () => {
    expect(escapeLike('50%_off!')).toBe('50!%!_off!!');
    expect(escapeLike('plain')).toBe('plain');
  });

  it('GIVEN the sort fields WHEN mapped THEN each resolves to a fixed column', () => {
    expect(NAMESPACE_SORT_COLUMNS).toEqual({
      name: 'name',
      created_at: 'created_at',
      modified_at: 'updated_at',
    });
    expect(ENTRY_SORT_COLUMNS).toEqual({
      name: 'entry_name',
      created_at: 'created_at',
      modified_at: 'updated_at',
      env_dependent: 'env_dependent',
    });
  });
});

describe('MysqlNamespaceRepository.listNamespaces', () => {
  const query: NamespaceListQuery = {
    page: 3,
    pageSize: 50,
    sort: 'modified_at',
    direction: 'desc',
    name: '50%_x',
  };

  it('GIVEN a filtered, sorted, paged query WHEN listed THEN the SQL uses allowlisted columns and escaped parameters', async () => {
    const { pool, calls } = fakePool((sql) =>
      has(sql, 'COUNT(*)') ? [{ total: 120 }] : [nsRow(1, 'alpha', 'first'), nsRow(2, 'beta')],
    );

    const page = await new MysqlNamespaceRepository(pool).listNamespaces(query);

    const list = calls[1]!;
    expect(list.sql).toContain("WHERE LOWER(name) LIKE LOWER(?) ESCAPE '!'");
    expect(list.sql).toContain('ORDER BY updated_at DESC, name ASC LIMIT ? OFFSET ?');
    expect(list.params).toEqual(['%50!%!_x%', 50, 100]);
    expect(calls[0]!.params).toEqual(['%50!%!_x%']);
    expect(page).toMatchObject({ page: 3, pageSize: 50, totalItems: 120, totalPages: 3 });
    expect(page.items).toEqual([
      { name: 'alpha', description: 'first', createdAt: T0, modifiedAt: T0 },
      { name: 'beta', createdAt: T0, modifiedAt: T0 },
    ]);
  });

  it('GIVEN no filter and ascending order WHEN listed THEN there is no WHERE clause', async () => {
    const { pool, calls } = fakePool((sql) => (has(sql, 'COUNT(*)') ? [] : []));

    const page = await new MysqlNamespaceRepository(pool).listNamespaces({
      page: 1,
      pageSize: 10,
      sort: 'name',
      direction: 'asc',
      name: '',
    });

    expect(calls[1]!.sql).not.toContain('WHERE');
    expect(calls[1]!.sql).toContain('ORDER BY name ASC, name ASC');
    expect(page).toMatchObject({ items: [], totalItems: 0, totalPages: 0 });
  });
});

describe('MysqlNamespaceRepository.listEntries', () => {
  const query: EntryListQuery = {
    page: 2,
    pageSize: 10,
    sort: 'env_dependent',
    direction: 'desc',
    name: 'db',
    envDependent: true,
  };

  it('GIVEN a missing namespace WHEN listed THEN undefined is returned', async () => {
    const { pool } = fakePool(() => []);

    expect(await new MysqlNamespaceRepository(pool).listEntries('nope', query)).toBeUndefined();
  });

  it('GIVEN filters WHEN listed THEN name and env_dependent conditions are parameterized', async () => {
    const { pool, calls } = fakePool((sql) => {
      if (has(sql, 'FROM namespaces')) return [{ id: 7 }];
      if (has(sql, 'COUNT(*)')) return [{ total: 11 }];
      return [entryRow(1, 7, 'db-host')];
    });

    const page = await new MysqlNamespaceRepository(pool).listEntries('ns', query);

    const list = calls[2]!;
    expect(list.sql).toContain(
      "WHERE namespace_id = ? AND LOWER(entry_name) LIKE LOWER(?) ESCAPE '!' AND env_dependent = ?",
    );
    expect(list.sql).toContain('ORDER BY env_dependent DESC, entry_name ASC');
    expect(list.params).toEqual([7, '%db%', 1, 10, 10]);
    expect(page).toMatchObject({ page: 2, totalItems: 11, totalPages: 2 });
    expect(page?.items[0]?.name).toBe('db-host');
  });

  it('GIVEN an env_dependent=false filter and no name WHEN listed THEN only the marker condition is added', async () => {
    const { pool, calls } = fakePool((sql) => (has(sql, 'FROM namespaces') ? [{ id: 1 }] : []));

    await new MysqlNamespaceRepository(pool).listEntries('ns', {
      page: 1,
      pageSize: 10,
      sort: 'name',
      direction: 'asc',
      envDependent: false,
    });

    expect(calls[2]!.sql).toContain('WHERE namespace_id = ? AND env_dependent = ?');
    expect(calls[2]!.params.slice(0, 2)).toEqual([1, 0]);
  });
});

describe('MysqlNamespaceRepository transactions', () => {
  const fresh = Namespace.create({
    name: 'billing',
    description: 'Billing',
    entries: [Entry.create({ name: 'currency', value: 'EUR', envDependent: true })],
  });

  function creationScript(overrides: Script = () => undefined): Script {
    return (sql, params) => {
      const custom = overrides(sql, params);
      if (custom !== undefined) return custom;
      if (has(sql, 'INSERT INTO namespaces')) return { insertId: 5 };
      if (has(sql, 'FROM namespaces WHERE id')) return [nsRow(5, 'billing', 'Billing')];
      if (has(sql, 'FROM entries WHERE namespace_id = ? ORDER BY'))
        return [entryRow(9, 5, 'currency', 'EUR')];
      return [];
    };
  }

  it('GIVEN a new namespace WHEN created THEN it is inserted with its entries in one committed transaction', async () => {
    const { pool, calls, events } = fakePool(creationScript());

    const created = await new MysqlNamespaceRepository(pool).create(fresh);

    expect(events).toEqual(['begin', 'commit', 'release']);
    expect(calls[0]).toEqual({
      sql: 'INSERT INTO namespaces (name, description) VALUES (?, ?)',
      params: ['billing', 'Billing'],
    });
    const insertEntry = calls.find((call) => call.sql.includes('INSERT INTO entries'))!;
    expect(insertEntry.params).toEqual([5, 'currency', 'EUR', null, 1, null]);
    expect(created.name).toBe('billing');
    expect(created.getEntry('currency').value).toBe('EUR');
    expect(created.createdAt).toEqual(T0);
  });

  it('GIVEN a taken name WHEN created THEN a duplicate-namespace error is thrown and the transaction rolls back', async () => {
    const { pool, events } = fakePool(
      creationScript((sql) =>
        has(sql, 'INSERT INTO namespaces') ? duplicate('namespaces.uq_namespaces_name') : undefined,
      ),
    );

    await expect(new MysqlNamespaceRepository(pool).create(fresh)).rejects.toBeInstanceOf(
      DuplicateNamespaceError,
    );
    expect(events).toEqual(['begin', 'rollback', 'release']);
  });

  it('GIVEN an unrelated database failure WHEN created THEN it propagates after a rollback', async () => {
    const boom = new Error('connection lost');
    const { pool, events } = fakePool(
      creationScript((sql) => (has(sql, 'INSERT INTO namespaces') ? boom : undefined)),
    );

    await expect(new MysqlNamespaceRepository(pool).create(fresh)).rejects.toBe(boom);
    expect(events).toEqual(['begin', 'rollback', 'release']);
  });

  it('GIVEN a duplicate entry key WHEN created THEN a duplicate-entry error is thrown and rolled back', async () => {
    const { pool, events } = fakePool(
      creationScript((sql) =>
        has(sql, 'INSERT INTO entries')
          ? duplicate('entries.uq_entries_namespace_name')
          : undefined,
      ),
    );

    await expect(new MysqlNamespaceRepository(pool).create(fresh)).rejects.toBeInstanceOf(
      DuplicateEntryError,
    );
    expect(events).toContain('rollback');
  });

  it('GIVEN a duplicate-key error for another key WHEN created THEN it is not misreported', async () => {
    const other = duplicate('something_else');
    const { pool } = fakePool(
      creationScript((sql) => (has(sql, 'INSERT INTO namespaces') ? other : undefined)),
    );

    await expect(new MysqlNamespaceRepository(pool).create(fresh)).rejects.toBe(other);
  });

  it('GIVEN a missing namespace WHEN saved or renamed THEN not-found is thrown and rolled back', async () => {
    const { pool, events } = fakePool(() => []);
    const repository = new MysqlNamespaceRepository(pool);

    await expect(repository.save(fresh)).rejects.toBeInstanceOf(NamespaceNotFoundError);
    await expect(repository.rename('old', fresh)).rejects.toBeInstanceOf(NamespaceNotFoundError);
    expect(events.filter((event) => event === 'rollback')).toHaveLength(2);
  });

  function saveScript(
    stored: ReturnType<typeof entryRow>[],
    overrides: Script = () => undefined,
  ): Script {
    return (sql, params) => {
      const custom = overrides(sql, params);
      if (custom !== undefined) return custom;
      if (has(sql, 'WHERE name = ? FOR UPDATE')) return [nsRow(5, 'billing', 'Billing')];
      if (has(sql, 'FROM entries WHERE namespace_id = ? FOR UPDATE')) return stored;
      if (has(sql, 'FROM namespaces WHERE id')) return [nsRow(5, 'billing', 'Billing')];
      if (has(sql, 'ORDER BY entry_name')) return stored;
      return [];
    };
  }

  it('GIVEN unchanged content WHEN saved THEN nothing is written and updated_at is not touched', async () => {
    const stored = [entryRow(9, 5, 'currency', 'EUR')];
    const { pool, calls, events } = fakePool(saveScript(stored));
    const same = Namespace.create({
      name: 'billing',
      description: 'Billing',
      entries: [Entry.create({ name: 'currency', value: 'EUR' })],
    });

    await new MysqlNamespaceRepository(pool).save(same);

    const writes = calls.filter((call) => /^(INSERT|UPDATE|DELETE)/.test(call.sql));
    expect(writes).toEqual([]);
    expect(events).toEqual(['begin', 'commit', 'release']);
  });

  it('GIVEN added, changed and removed entries WHEN saved THEN it diffs and touches updated_at once', async () => {
    const stored = [entryRow(1, 5, 'gone'), entryRow(2, 5, 'edited', 'old')];
    const { pool, calls } = fakePool(saveScript(stored));
    const next = Namespace.create({
      name: 'billing',
      description: 'Billing',
      entries: [
        Entry.create({ name: 'edited', value: 'new', description: 'doc', envDependent: true }),
        Entry.create({ name: 'added', value: 'x', createdAt: T0 }),
      ],
    });

    await new MysqlNamespaceRepository(pool).save(next);

    const writes = calls.filter((call) => /^(INSERT|UPDATE|DELETE)/.test(call.sql));
    expect(writes.map((call) => call.sql.split(' ').slice(0, 3).join(' '))).toEqual([
      'DELETE FROM entries',
      'UPDATE entries SET',
      'INSERT INTO entries',
      'UPDATE namespaces SET',
    ]);
    expect(writes[0]!.params).toEqual([[1]]);
    expect(writes[1]!.params).toEqual(['new', 'doc', 1, 2]);
    expect(writes[2]!.params).toEqual([5, 'added', 'x', null, 0, T0]);
    expect(writes[3]!.sql).toContain('updated_at = CURRENT_TIMESTAMP');
  });

  it('GIVEN a rename to a taken name WHEN applied THEN a duplicate-namespace error rolls everything back', async () => {
    const { pool, events } = fakePool(
      saveScript([], (sql) =>
        has(sql, 'UPDATE namespaces SET') ? duplicate('namespaces.uq_namespaces_name') : undefined,
      ),
    );
    const renamed = Namespace.create({ name: 'taken', description: 'Billing' });

    await expect(
      new MysqlNamespaceRepository(pool).rename('billing', renamed),
    ).rejects.toBeInstanceOf(DuplicateNamespaceError);
    expect(events).toEqual(['begin', 'rollback', 'release']);
  });

  it('GIVEN a failing UPDATE that is not a duplicate WHEN persisted THEN the original error surfaces', async () => {
    const boom = new Error('deadlock');
    const { pool } = fakePool(
      saveScript([], (sql) => (has(sql, 'UPDATE namespaces SET') ? boom : undefined)),
    );

    await expect(
      new MysqlNamespaceRepository(pool).save(
        Namespace.create({ name: 'billing', description: 'other' }),
      ),
    ).rejects.toBe(boom);
  });

  it('GIVEN a namespace WHEN deleted THEN affected rows decide the result', async () => {
    const { pool } = fakePool((_sql, params) => ({ affectedRows: params[0] === 'a' ? 1 : 0 }));
    const repository = new MysqlNamespaceRepository(pool);

    expect(await repository.delete('a')).toBe(true);
    expect(await repository.delete('b')).toBe(false);
  });

  it('GIVEN a stored namespace WHEN found or missing THEN it is hydrated or undefined', async () => {
    const found = fakePool((sql) => {
      if (has(sql, 'WHERE name = ?')) return [nsRow(3, 'alpha', 'about')];
      if (has(sql, 'FROM namespaces WHERE id')) return [nsRow(3, 'alpha', 'about')];
      return [entryRow(1, 3, 'k')];
    });
    const repository = new MysqlNamespaceRepository(found.pool);

    const namespace = await repository.findByName('alpha');
    expect(namespace?.description).toBe('about');
    expect(namespace?.entries.map((entry) => entry.name)).toEqual(['k']);
    expect(namespace?.modifiedAt).toEqual(T0);
    expect(
      await new MysqlNamespaceRepository(fakePool(() => []).pool).findByName('nope'),
    ).toBeUndefined();
  });

  it('GIVEN stored rows WHEN everything is listed THEN entries are grouped under their namespaces', async () => {
    const { pool } = fakePool((sql) =>
      has(sql, 'FROM namespaces')
        ? [nsRow(1, 'a'), nsRow(2, 'b')]
        : [entryRow(1, 1, 'x'), entryRow(2, 2, 'y'), entryRow(3, 2, 'z')],
    );

    const all = await new MysqlNamespaceRepository(pool).listAll();

    expect(all.map((item) => [item.name, item.entries.map((entry) => entry.name)])).toEqual([
      ['a', ['x']],
      ['b', ['y', 'z']],
    ]);
  });
});

describe('MysqlNamespaceRepository.importNamespaces', () => {
  it('GIVEN a new and an existing namespace WHEN imported THEN one transaction upserts both and keeps the stored description', async () => {
    const { pool, calls, events } = fakePool((sql, params) => {
      if (has(sql, 'WHERE name = ? FOR UPDATE')) {
        return params[0] === 'old' ? [nsRow(1, 'old', 'stored description')] : [];
      }
      if (has(sql, 'INSERT INTO namespaces')) return { insertId: 2 };
      if (has(sql, 'FROM entries WHERE namespace_id = ? FOR UPDATE'))
        return [entryRow(1, 1, 'stale')];
      if (has(sql, 'FROM namespaces WHERE id'))
        return [nsRow(params[0] as number, params[0] === 1 ? 'old' : 'new')];
      return [];
    });

    const result = await new MysqlNamespaceRepository(pool).importNamespaces([
      Namespace.create({ name: 'old', entries: [Entry.create({ name: 'fresh', value: 'v' })] }),
      Namespace.create({ name: 'new' }),
    ]);

    expect(events).toEqual(['begin', 'commit', 'release']);
    expect(result.map((item) => item.name)).toEqual(['old', 'new']);
    const namespaceUpdate = calls.find((call) => call.sql.startsWith('UPDATE namespaces'))!;
    expect(namespaceUpdate.params).toEqual(['old', 'stored description', 1]);
    expect(calls.some((call) => call.sql.startsWith('DELETE FROM entries'))).toBe(true);
  });

  it('GIVEN a failure on the second namespace WHEN imported THEN the whole import rolls back', async () => {
    const { pool, events } = fakePool((sql, params) => {
      if (has(sql, 'WHERE name = ? FOR UPDATE')) return [];
      if (has(sql, 'INSERT INTO namespaces')) {
        return params[0] === 'second' ? new Error('disk full') : { insertId: 1 };
      }
      return [];
    });

    await expect(
      new MysqlNamespaceRepository(pool).importNamespaces([
        Namespace.create({ name: 'first' }),
        Namespace.create({ name: 'second' }),
      ]),
    ).rejects.toThrow('disk full');
    expect(events).toEqual(['begin', 'rollback', 'release']);
  });
});

describe('MysqlReadinessIndicator', () => {
  it('GIVEN a reachable, migrated database WHEN checked THEN it is ready', async () => {
    const { pool, calls } = fakePool(() => []);

    expect(await new MysqlReadinessIndicator(pool).check()).toBe(true);
    expect(calls.map((call) => call.sql)).toEqual([
      'SELECT id, name, description FROM namespaces LIMIT 1',
      'SELECT id, namespace_id, entry_name, description, env_dependent FROM entries LIMIT 1',
    ]);
  });

  it('GIVEN an unreachable database or missing schema WHEN checked THEN it is not ready', async () => {
    const { pool } = fakePool(() => new Error("Table 'okvns.entries' doesn't exist"));

    expect(await new MysqlReadinessIndicator(pool).check()).toBe(false);
  });
});

describe('MysqlDatabase and persistence wiring', () => {
  const mysql = {
    host: '127.0.0.1',
    port: 1,
    database: 'okvns',
    user: 'okvns',
    password: '',
    poolLimit: 2,
    connectTimeoutMs: 200,
  };

  it('GIVEN a config WHEN the database is created THEN it connects lazily and closes cleanly', async () => {
    const database = new MysqlDatabase(mysql);

    expect(database.pool).toBeDefined();
    await database.onModuleDestroy();
  });

  it('GIVEN the mysql driver WHEN persistence is built THEN readiness fails against an unreachable server and shutdown is clean', async () => {
    const persistence = createPersistence({
      port: 3000,
      corsOrigin: '*',
      storageDriver: 'mysql',
      mysql,
    });

    expect(await persistence.readiness.check()).toBe(false);
    await persistence.onModuleDestroy();
  });

  it('GIVEN the memory driver WHEN persistence is built THEN it is always ready and shutdown is a no-op', async () => {
    const persistence = createPersistence({ port: 3000, corsOrigin: '*', storageDriver: 'memory' });

    expect(await persistence.readiness.check()).toBe(true);
    await persistence.onModuleDestroy();
  });
});
