import {
  DuplicateEntryError,
  DuplicateNamespaceError,
  Entry,
  Namespace,
  NamespaceNotFoundError,
} from '@okvns/domain';
import type { EntryListQuery, NamespaceListQuery } from '@okvns/shared';
import type { Pool } from 'mysql2/promise';
import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import {
  applyMigrations,
  createMigrationPool,
  mysqlTestConfig,
  resetTables,
} from '../../../test/mysql-test-db';
import { MysqlNamespaceRepository } from './mysql-namespace-repository';

/** Runs only when `OKVNS_TEST_MYSQL_*` points at a disposable database (see test/mysql-test-db.ts). */
const config = mysqlTestConfig();
const entry = (name: string, value = 'v', extra: Record<string, unknown> = {}) =>
  Entry.create({ name, value, ...extra });
const ns = (name: string, entries: Entry[] = [], extra: Record<string, unknown> = {}) =>
  Namespace.create({ name, entries, ...extra });
const nsQuery = (overrides: Partial<NamespaceListQuery> = {}): NamespaceListQuery => ({
  page: 1,
  pageSize: 10,
  sort: 'name',
  direction: 'asc',
  ...overrides,
});
const entryQuery = (overrides: Partial<EntryListQuery> = {}): EntryListQuery => ({
  page: 1,
  pageSize: 10,
  sort: 'name',
  direction: 'asc',
  ...overrides,
});
const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

describe.skipIf(!config)('MysqlNamespaceRepository (integration)', () => {
  let pool: Pool;
  let repository: MysqlNamespaceRepository;

  beforeAll(async () => {
    pool = createMigrationPool(config!);
    await applyMigrations(pool);
    repository = new MysqlNamespaceRepository(pool);
  });

  beforeEach(async () => {
    await resetTables(pool);
  });

  afterAll(async () => {
    await pool.end();
  });

  it('GIVEN a namespace with descriptions and env markers WHEN stored and read back THEN everything round-trips', async () => {
    await repository.create(
      ns('billing', [entry('currency', 'EUR', { description: 'Default', envDependent: true })], {
        description: 'Billing settings',
      }),
    );

    const stored = await repository.findByName('billing');

    expect(stored?.description).toBe('Billing settings');
    expect(stored?.getEntry('currency')).toMatchObject({
      value: 'EUR',
      description: 'Default',
      envDependent: true,
    });
    expect(stored?.createdAt).toBeInstanceOf(Date);
    expect(stored?.getEntry('currency').modifiedAt).toBeInstanceOf(Date);
  });

  it('GIVEN unicode names and values WHEN stored THEN they are preserved exactly', async () => {
    await repository.create(ns('日本語-ñ', [entry('clé', 'valeur 🚀\nligne 2')]));

    expect((await repository.findByName('日本語-ñ'))?.getEntry('clé').value).toBe(
      'valeur 🚀\nligne 2',
    );
  });

  it('GIVEN names differing only by case WHEN stored THEN both exist (utf8mb4_bin is case-sensitive)', async () => {
    await repository.create(ns('Config'));
    await repository.create(ns('config'));

    expect((await repository.listAll()).map((item) => item.name)).toEqual(['Config', 'config']);
  });

  it('GIVEN concurrent creations of one name WHEN raced THEN exactly one wins and the rest are duplicates', async () => {
    const results = await Promise.allSettled(
      Array.from({ length: 6 }, () => repository.create(ns('race'))),
    );

    expect(results.filter((result) => result.status === 'fulfilled')).toHaveLength(1);
    for (const result of results.filter((item) => item.status === 'rejected')) {
      expect((result as PromiseRejectedResult).reason).toBeInstanceOf(DuplicateNamespaceError);
    }
    expect((await repository.listAll()).filter((item) => item.name === 'race')).toHaveLength(1);
  });

  it('GIVEN concurrent creations of one entry WHEN raced THEN exactly one is stored', async () => {
    const base = await repository.create(ns('ns'));

    const results = await Promise.allSettled(
      Array.from({ length: 6 }, () => repository.save(base.addEntry(entry('same')))),
    );

    expect(results.filter((result) => result.status === 'fulfilled').length).toBeGreaterThanOrEqual(
      1,
    );
    for (const result of results.filter((item) => item.status === 'rejected')) {
      expect((result as PromiseRejectedResult).reason).toBeInstanceOf(DuplicateEntryError);
    }
    expect((await repository.findByName('ns'))?.entries).toHaveLength(1);
  });

  it('GIVEN an entry update WHEN saved THEN creation is stable and namespace modification moves', async () => {
    const created = await repository.create(ns('a', [entry('k', 'old')]));
    await sleep(1100);

    const saved = await repository.save(created.updateEntry('k', { value: 'new' }));

    expect(saved.getEntry('k').value).toBe('new');
    expect(saved.getEntry('k').createdAt).toEqual(created.getEntry('k').createdAt);
    expect(saved.getEntry('k').modifiedAt!.getTime()).toBeGreaterThan(
      created.getEntry('k').modifiedAt!.getTime(),
    );
    expect(saved.modifiedAt!.getTime()).toBeGreaterThan(created.modifiedAt!.getTime());
    expect(saved.createdAt).toEqual(created.createdAt);
  });

  it('GIVEN an entry rename WHEN saved THEN the entry keeps its creation time', async () => {
    const created = await repository.create(ns('a', [entry('old')]));
    await sleep(1100);

    const saved = await repository.save(created.updateEntry('old', { name: 'new' }));

    expect(saved.hasEntry('old')).toBe(false);
    expect(saved.getEntry('new').createdAt).toEqual(created.getEntry('old').createdAt);
  });

  it('GIVEN a taken name WHEN a namespace is renamed THEN it fails and both namespaces are unchanged', async () => {
    const a = await repository.create(ns('a', [entry('k')]));
    await repository.create(ns('b'));

    await expect(repository.rename('a', a.update({ name: 'b' }))).rejects.toBeInstanceOf(
      DuplicateNamespaceError,
    );
    expect((await repository.findByName('a'))?.entries).toHaveLength(1);
    expect(await repository.findByName('b')).toBeDefined();
  });

  it('GIVEN a namespace WHEN renamed THEN entries move with it atomically', async () => {
    const created = await repository.create(ns('old', [entry('k')], { description: 'd' }));

    const renamed = await repository.rename('old', created.update({ name: 'new' }));

    expect(renamed.entries.map((item) => item.name)).toEqual(['k']);
    expect(await repository.findByName('old')).toBeUndefined();
    expect((await repository.findByName('new'))?.description).toBe('d');
  });

  it('GIVEN a missing namespace WHEN saved THEN not-found is thrown', async () => {
    await expect(repository.save(ns('ghost'))).rejects.toBeInstanceOf(NamespaceNotFoundError);
  });

  it('GIVEN a namespace WHEN deleted THEN its entries cascade away', async () => {
    await repository.create(ns('a', [entry('k')]));

    expect(await repository.delete('a')).toBe(true);
    expect(await repository.delete('a')).toBe(false);
    const [rows] = await pool.query('SELECT COUNT(*) AS total FROM entries');
    expect((rows as { total: number }[])[0]!.total).toBe(0);
  });

  it('GIVEN many namespaces WHEN paged, sorted and filtered THEN the database applies them with a name tie-break', async () => {
    for (const name of ['charlie', 'alpha', 'bravo', 'delta-50%']) {
      await repository.create(ns(name));
    }

    const desc = await repository.listNamespaces(nsQuery({ direction: 'desc', pageSize: 10 }));
    expect(desc.items.map((item) => item.name)).toEqual(['delta-50%', 'charlie', 'bravo', 'alpha']);

    const filtered = await repository.listNamespaces(nsQuery({ name: 'AL' }));
    expect(filtered.items.map((item) => item.name)).toEqual(['alpha']);

    const tied = await repository.listNamespaces(nsQuery({ sort: 'created_at' }));
    expect(tied.items.map((item) => item.name)).toEqual(['alpha', 'bravo', 'charlie', 'delta-50%']);

    expect(
      (await repository.listNamespaces(nsQuery({ name: '%' }))).items.map((i) => i.name),
    ).toEqual(['delta-50%']);
    expect((await repository.listNamespaces(nsQuery({ name: '_' }))).totalItems).toBe(0);

    const paged = await repository.listNamespaces(nsQuery({ page: 2 }));
    expect(paged).toMatchObject({ items: [], totalItems: 4, totalPages: 1 });
  });

  it('GIVEN entries WHEN listed with filters and orderings THEN the database applies them', async () => {
    await repository.create(
      ns('ns', [
        entry('db-host', 'h', { envDependent: true }),
        entry('db-port', 'p'),
        entry('retries', 'r', { envDependent: true }),
      ]),
    );

    const names = async (overrides: Partial<EntryListQuery>) =>
      (await repository.listEntries('ns', entryQuery(overrides)))?.items.map((item) => item.name);

    expect(await names({ envDependent: true })).toEqual(['db-host', 'retries']);
    expect(await names({ envDependent: false })).toEqual(['db-port']);
    expect(await names({ name: 'DB', envDependent: true })).toEqual(['db-host']);
    expect(await names({ sort: 'env_dependent' })).toEqual(['db-port', 'db-host', 'retries']);
    expect(await names({ sort: 'env_dependent', direction: 'desc' })).toEqual([
      'db-host',
      'retries',
      'db-port',
    ]);
    expect(await repository.listEntries('missing', entryQuery())).toBeUndefined();
  });

  it('GIVEN an import WHEN applied THEN existing namespaces have entries replaced and new ones are created', async () => {
    await repository.create(ns('a', [entry('stale')], { description: 'kept' }));

    const result = await repository.importNamespaces([
      ns('a', [entry('fresh')]),
      ns('b', [entry('k')], { description: 'new' }),
    ]);

    expect(result.map((item) => item.name)).toEqual(['a', 'b']);
    const a = await repository.findByName('a');
    expect(a?.entries.map((item) => item.name)).toEqual(['fresh']);
    expect(a?.description).toBe('kept');
    expect((await repository.findByName('b'))?.description).toBe('new');
  });

  it('GIVEN a storage error part-way through an import WHEN applied THEN nothing is committed', async () => {
    await repository.create(ns('a', [entry('keep')]));
    const failing = new MysqlNamespaceRepository(failOnNthInsert(pool, 'INSERT INTO entries', 2));

    await expect(
      failing.importNamespaces([ns('a', [entry('fresh')]), ns('b', [entry('one'), entry('two')])]),
    ).rejects.toThrow('injected failure');

    expect((await repository.findByName('a'))?.entries.map((item) => item.name)).toEqual(['keep']);
    expect(await repository.findByName('b')).toBeUndefined();
  });

  it('GIVEN a failure during a namespace rename WHEN applied THEN the original stays intact', async () => {
    const created = await repository.create(ns('a', [entry('k')]));
    const failing = new MysqlNamespaceRepository(failOnNthInsert(pool, 'UPDATE namespaces SET', 1));

    await expect(failing.rename('a', created.update({ name: 'b' }))).rejects.toThrow(
      'injected failure',
    );

    expect((await repository.findByName('a'))?.entries).toHaveLength(1);
    expect(await repository.findByName('b')).toBeUndefined();
  });

  it('GIVEN migrations WHEN applied again THEN they are idempotent and keep data', async () => {
    await repository.create(ns('a', [entry('k')]));

    await applyMigrations(pool);

    expect((await repository.findByName('a'))?.hasEntry('k')).toBe(true);
  });
});

/** Wraps a pool so the Nth statement starting with `prefix` fails, to test rollback. */
function failOnNthInsert(pool: Pool, prefix: string, nth: number): Pool {
  return new Proxy(pool, {
    get(target, property, receiver) {
      if (property !== 'getConnection') {
        return Reflect.get(target, property, receiver);
      }
      return async () => {
        const connection = await target.getConnection();
        let seen = 0;
        const originalQuery = connection.query.bind(connection) as (
          ...args: unknown[]
        ) => Promise<unknown>;
        (connection as { query: unknown }).query = async (...args: unknown[]) => {
          const sql = typeof args[0] === 'string' ? args[0].replace(/\s+/g, ' ').trim() : '';
          if (sql.startsWith(prefix) && ++seen === nth) {
            throw new Error('injected failure');
          }
          return originalQuery(...args);
        };
        return connection;
      };
    },
  });
}
