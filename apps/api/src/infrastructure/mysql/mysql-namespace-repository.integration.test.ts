import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import type { Pool, PoolConnection } from 'mysql2/promise';
import { DuplicateNamespaceError, Entry, Namespace, NamespaceNotFoundError } from '@okvns/domain';
import { createTestPool, mysqlTestAvailable, resetSchema } from '../../../test/mysql-test-db';
import { MysqlNamespaceRepository } from './mysql-namespace-repository';

/**
 * Integration tests for the MySQL adapter. Skipped unless a test database is
 * configured via OKVNS_TEST_MYSQL_* env vars (see test/mysql-test-db.ts).
 */
describe.skipIf(!mysqlTestAvailable)('MysqlNamespaceRepository (integration)', () => {
  let pool: Pool;
  let repository: MysqlNamespaceRepository;

  beforeAll(() => {
    pool = createTestPool();
  });

  afterAll(async () => {
    await pool.end();
  });

  beforeEach(async () => {
    await resetSchema(pool);
    repository = new MysqlNamespaceRepository(pool);
  });

  function namespaceWith(name: string, entries: Array<[string, string]> = []): Namespace {
    const namespace = Namespace.create(name);
    namespace.setEntries(entries.map(([entryName, value]) => Entry.create(entryName, value)));
    return namespace;
  }

  it('GIVEN a new namespace WHEN created THEN it can be retrieved with its entries', async () => {
    await repository.create(namespaceWith('users', [['admin', 'secret']]));

    const stored = await repository.findByName('users');
    expect(stored?.name).toBe('users');
    expect(stored?.getEntry('admin').value).toBe('secret');
    expect(await repository.existsByName('users')).toBe(true);
  });

  it('GIVEN multiple namespaces WHEN listed THEN they are returned in deterministic order', async () => {
    await repository.create(namespaceWith('zeta'));
    await repository.create(namespaceWith('alpha'));

    const listed = await repository.list();
    expect(listed.map((namespace) => namespace.name)).toEqual(['alpha', 'zeta']);
  });

  it('GIVEN a duplicate name WHEN created THEN it throws DuplicateNamespaceError', async () => {
    await repository.create(namespaceWith('users'));
    await expect(repository.create(namespaceWith('users'))).rejects.toBeInstanceOf(
      DuplicateNamespaceError,
    );
  });

  it('GIVEN an existing namespace WHEN renamed THEN it keeps its entries under the new name', async () => {
    await repository.create(namespaceWith('users', [['admin', 'secret']]));

    await repository.rename('users', 'people');

    expect(await repository.existsByName('users')).toBe(false);
    const renamed = await repository.findByName('people');
    expect(renamed?.getEntry('admin').value).toBe('secret');
  });

  it('GIVEN a rename to an existing name WHEN attempted THEN it throws and leaves the original unchanged', async () => {
    await repository.create(namespaceWith('users', [['admin', 'secret']]));
    await repository.create(namespaceWith('people'));

    await expect(repository.rename('users', 'people')).rejects.toBeInstanceOf(
      DuplicateNamespaceError,
    );

    // Original namespace and its entry survive the failed rename (atomicity).
    const original = await repository.findByName('users');
    expect(original?.getEntry('admin').value).toBe('secret');
  });

  it('GIVEN a missing namespace WHEN renamed THEN it throws NamespaceNotFoundError', async () => {
    await expect(repository.rename('missing', 'x')).rejects.toBeInstanceOf(NamespaceNotFoundError);
  });

  it('GIVEN a namespace WHEN deleted THEN it and its entries are removed via cascade', async () => {
    await repository.create(namespaceWith('users', [['admin', 'secret']]));

    expect(await repository.delete('users')).toBe(true);
    expect(await repository.findByName('users')).toBeNull();
    // Recreating starts empty, proving the entry row was cascaded away.
    await repository.create(namespaceWith('users'));
    expect((await repository.findByName('users'))?.toDto().entries).toEqual([]);
  });

  it('GIVEN an import of multiple namespaces WHEN applied THEN all are stored', async () => {
    await repository.importNamespaces([
      namespaceWith('users', [['admin', 'secret']]),
      namespaceWith('settings'),
    ]);

    expect((await repository.list()).map((namespace) => namespace.name)).toEqual([
      'settings',
      'users',
    ]);
  });

  it('GIVEN an existing namespace WHEN imported again THEN its entries are replaced', async () => {
    await repository.create(namespaceWith('users', [['old', '1']]));

    await repository.importNamespaces([namespaceWith('users', [['fresh', '2']])]);

    const stored = await repository.findByName('users');
    expect(stored?.hasEntry('old')).toBe(false);
    expect(stored?.getEntry('fresh').value).toBe('2');
  });

  it('GIVEN a storage failure mid-import WHEN it rolls back THEN existing storage is unchanged', async () => {
    await repository.create(namespaceWith('kept', [['a', '1']]));

    // Inject a failure when the second namespace of the batch is inserted, so
    // the first namespace's write must roll back with it.
    const failingRepository = new MysqlNamespaceRepository(
      failOnQuery(
        pool,
        (sql, params) =>
          sql.startsWith('INSERT INTO namespaces') && Array.isArray(params) && params[0] === 'boom',
      ),
    );

    await expect(
      failingRepository.importNamespaces([namespaceWith('created'), namespaceWith('boom')]),
    ).rejects.toThrow('injected failure');

    expect(await repository.existsByName('created')).toBe(false);
    expect((await repository.findByName('kept'))?.getEntry('a').value).toBe('1');
  });

  it('GIVEN a storage failure during save WHEN it rolls back THEN the original entries are preserved', async () => {
    await repository.create(namespaceWith('users', [['keep', '1']]));

    // Fail while re-inserting entries during save(). Because save() deletes the
    // existing entries before inserting the new ones inside one transaction, a
    // failed insert must roll the delete back and leave the original entry.
    const failingRepository = new MysqlNamespaceRepository(
      failOnQuery(pool, (sql) => sql.startsWith('INSERT INTO entries')),
    );

    await expect(
      failingRepository.save(namespaceWith('users', [['changed', '2']])),
    ).rejects.toThrow('injected failure');

    const stored = await repository.findByName('users');
    expect(stored?.getEntry('keep').value).toBe('1');
    expect(stored?.hasEntry('changed')).toBe(false);
  });

  it('GIVEN stored data WHEN a new repository is constructed THEN the data persists', async () => {
    await repository.create(namespaceWith('users', [['admin', 'secret']]));

    // A fresh adapter over the same database models an API/repository restart.
    const restarted = new MysqlNamespaceRepository(pool);
    const stored = await restarted.findByName('users');
    expect(stored?.getEntry('admin').value).toBe('secret');
  });
});

/**
 * Wraps a pool so that any transaction query matching `shouldFail` throws,
 * letting tests prove that a mutation rolls its whole transaction back.
 */
function failOnQuery(pool: Pool, shouldFail: (sql: string, params: unknown) => boolean): Pool {
  return new Proxy(pool, {
    get(target, prop, receiver) {
      if (prop === 'getConnection') {
        return async (): Promise<PoolConnection> => {
          const connection = await pool.getConnection();
          const realQuery = connection.query.bind(connection);
          connection.query = ((sql: unknown, params: unknown) => {
            if (typeof sql === 'string' && shouldFail(sql, params)) {
              throw new Error('injected failure');
            }
            return (realQuery as (sql: unknown, params: unknown) => unknown)(sql, params);
          }) as PoolConnection['query'];
          return connection;
        };
      }
      return Reflect.get(target, prop, receiver);
    },
  });
}
