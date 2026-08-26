import { beforeEach, describe, expect, it } from 'vitest';
import type { Pool, PoolConnection, ResultSetHeader } from 'mysql2/promise';
import { DuplicateNamespaceError, Entry, Namespace, NamespaceNotFoundError } from '@okvns/domain';
import type { EntryListQuery, NamespaceListQuery } from '@okvns/shared';
import { mysqlTestAvailable, useMysqlTestSchema } from '../../../test/mysql-test-db';
import { MysqlNamespaceRepository } from './mysql-namespace-repository';

/**
 * Integration tests for the MySQL adapter. Skipped unless a test database is
 * configured via OKVNS_TEST_MYSQL_* env vars (see test/mysql-test-db.ts).
 */
describe.skipIf(!mysqlTestAvailable)('MysqlNamespaceRepository (integration)', () => {
  const getPool = useMysqlTestSchema();
  let repository: MysqlNamespaceRepository;

  beforeEach(() => {
    repository = new MysqlNamespaceRepository(getPool());
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
        getPool(),
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

    // Fail while inserting the new entry during save(). save() reconciles
    // entries inside one transaction (deleting removed and inserting new), so a
    // failed insert must roll the whole reconciliation back and leave the
    // original entry.
    const failingRepository = new MysqlNamespaceRepository(
      failOnQuery(getPool(), (sql) => sql.startsWith('INSERT INTO entries')),
    );

    await expect(
      failingRepository.save(namespaceWith('users', [['changed', '2']])),
    ).rejects.toThrow('injected failure');

    const stored = await repository.findByName('users');
    expect(stored?.getEntry('keep').value).toBe('1');
    expect(stored?.hasEntry('changed')).toBe(false);
  });

  it('GIVEN a namespace WHEN read THEN it exposes ISO created/modified timestamps', async () => {
    await repository.create(namespaceWith('users', [['admin', 'secret']]));

    const stored = await repository.findByName('users');
    const iso = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/;
    expect(stored?.createdAt).toMatch(iso);
    expect(stored?.modifiedAt).toMatch(iso);
    expect(stored?.getEntry('admin').createdAt).toMatch(iso);
    expect(stored?.getEntry('admin').modifiedAt).toMatch(iso);
  });

  it('GIVEN an entry renamed via save WHEN read THEN the renamed entry keeps its created timestamp', async () => {
    await repository.create(namespaceWith('users', [['old', 'v']]));
    const before = await repository.findByName('users');
    const originalCreated = before!.getEntry('old').createdAt;

    // Model an entry rename: same logical entry, new name, preserved created_at.
    const renamed = Namespace.create('users');
    const carried = Entry.rehydrate('new', 'v', originalCreated, new Date().toISOString());
    renamed.setEntries([carried]);
    await repository.save(renamed);

    const after = await repository.findByName('users');
    expect(after!.hasEntry('old')).toBe(false);
    expect(after!.getEntry('new').createdAt).toBe(originalCreated);
  });

  it('GIVEN an entry value updated via save WHEN read THEN entry created is stable and namespace modified advances', async () => {
    await repository.create(namespaceWith('users', [['admin', 'secret']]));
    const before = await repository.findByName('users');
    const entryCreated = before!.getEntry('admin').createdAt;
    const namespaceModified = before!.modifiedAt;

    // A second of separation guarantees a distinct MySQL TIMESTAMP.
    await new Promise((resolve) => setTimeout(resolve, 1100));
    const changed = namespaceWith('users', [['admin', 'rotated']]);
    await repository.save(changed);

    const after = await repository.findByName('users');
    expect(after!.getEntry('admin').value).toBe('rotated');
    expect(after!.getEntry('admin').createdAt).toBe(entryCreated);
    expect(after!.modifiedAt >= namespaceModified).toBe(true);
  });

  it('GIVEN stored data WHEN a new repository is constructed THEN the data persists', async () => {
    await repository.create(namespaceWith('users', [['admin', 'secret']]));

    // A fresh adapter over the same database models an API/repository restart.
    const restarted = new MysqlNamespaceRepository(getPool());
    const stored = await restarted.findByName('users');
    expect(stored?.getEntry('admin').value).toBe('secret');
  });

  it('GIVEN descriptions WHEN created THEN they survive a repository restart', async () => {
    const namespace = Namespace.create('users', 'the users namespace');
    namespace.setEntries([Entry.create('admin', 'secret', 'the admin key')]);
    await repository.create(namespace);

    const restarted = new MysqlNamespaceRepository(getPool());
    const stored = await restarted.findByName('users');
    expect(stored?.description).toBe('the users namespace');
    expect(stored?.getEntry('admin').description).toBe('the admin key');
  });

  it('GIVEN no descriptions WHEN created THEN they read back as absent', async () => {
    await repository.create(namespaceWith('users', [['admin', 'secret']]));

    const stored = await repository.findByName('users');
    expect(stored?.description).toBeUndefined();
    expect(stored?.getEntry('admin').description).toBeUndefined();
  });

  it('GIVEN namespaces with descriptions WHEN listed THEN descriptions are included', async () => {
    await repository.create(Namespace.create('users', 'ns doc'));

    const listed = await repository.list();
    expect(listed[0].description).toBe('ns doc');
  });

  it('GIVEN a namespace description change WHEN saved THEN it is stored and created_at is stable', async () => {
    await repository.create(Namespace.create('users', 'old'));
    const before = await repository.findByName('users');
    const created = before!.createdAt;

    before!.describe('new');
    await repository.save(before!);

    const after = await repository.findByName('users');
    expect(after?.description).toBe('new');
    expect(after?.createdAt).toBe(created);
  });

  it('GIVEN a namespace description WHEN cleared via save THEN it is stored as absent', async () => {
    await repository.create(Namespace.create('users', 'old'));
    const stored = await repository.findByName('users');

    stored!.describe('   ');
    await repository.save(stored!);

    expect((await repository.findByName('users'))?.description).toBeUndefined();
  });

  it('GIVEN an entry description-only change WHEN saved THEN entry created is stable and modified advances', async () => {
    const seed = Namespace.create('users');
    seed.setEntries([Entry.create('admin', 'secret', 'old')]);
    await repository.create(seed);
    const before = await repository.findByName('users');
    const entryCreated = before!.getEntry('admin').createdAt;
    const entryModified = before!.getEntry('admin').modifiedAt;

    // A second of separation guarantees a distinct MySQL TIMESTAMP.
    await new Promise((resolve) => setTimeout(resolve, 1100));
    const changed = Namespace.create('users');
    changed.setEntries([Entry.create('admin', 'secret', 'new')]);
    await repository.save(changed);

    const after = await repository.findByName('users');
    expect(after!.getEntry('admin').description).toBe('new');
    expect(after!.getEntry('admin').value).toBe('secret');
    expect(after!.getEntry('admin').createdAt).toBe(entryCreated);
    expect(after!.getEntry('admin').modifiedAt > entryModified).toBe(true);
  });

  it('GIVEN a namespace with a description WHEN renamed THEN the description is preserved', async () => {
    await repository.create(Namespace.create('users', 'the users'));

    await repository.rename('users', 'people');

    expect((await repository.findByName('people'))?.description).toBe('the users');
  });

  it('GIVEN descriptions WHEN imported THEN they are stored', async () => {
    const incoming = Namespace.create('users', 'ns doc');
    incoming.setEntries([Entry.create('admin', 'secret', 'entry doc')]);
    await repository.importNamespaces([incoming]);

    const stored = await repository.findByName('users');
    expect(stored?.description).toBe('ns doc');
    expect(stored?.getEntry('admin').description).toBe('entry doc');
  });

  it('GIVEN env_dependent entries WHEN created THEN the flags survive a repository restart', async () => {
    const seed = Namespace.create('users');
    seed.setEntries([
      Entry.create('db-host', 'localhost', undefined, true),
      Entry.create('retries', '3'),
    ]);
    await repository.create(seed);

    const stored = await new MysqlNamespaceRepository(getPool()).findByName('users');
    expect(stored?.getEntry('db-host').envDependent).toBe(true);
    expect(stored?.getEntry('retries').envDependent).toBe(false);
  });

  it('GIVEN env_dependent entries WHEN listed THEN the flags are included', async () => {
    const seed = Namespace.create('users');
    seed.setEntries([Entry.create('db-host', 'localhost', undefined, true)]);
    await repository.create(seed);

    const listed = await repository.list();
    expect(listed[0].getEntry('db-host').envDependent).toBe(true);
  });

  it('GIVEN an entry env_dependent-only change WHEN saved THEN entry created is stable and modified advances', async () => {
    const seed = Namespace.create('users');
    seed.setEntries([Entry.create('admin', 'secret')]);
    await repository.create(seed);
    const before = await repository.findByName('users');
    const entryCreated = before!.getEntry('admin').createdAt;
    const entryModified = before!.getEntry('admin').modifiedAt;

    // A second of separation guarantees a distinct MySQL TIMESTAMP.
    await new Promise((resolve) => setTimeout(resolve, 1100));
    const changed = Namespace.create('users');
    changed.setEntries([Entry.create('admin', 'secret', undefined, true)]);
    await repository.save(changed);

    const after = await repository.findByName('users');
    expect(after!.getEntry('admin').envDependent).toBe(true);
    expect(after!.getEntry('admin').value).toBe('secret');
    expect(after!.getEntry('admin').createdAt).toBe(entryCreated);
    expect(after!.getEntry('admin').modifiedAt > entryModified).toBe(true);
  });

  it('GIVEN an env-dependent entry WHEN the flag is cleared via save THEN it reads back as false', async () => {
    const seed = Namespace.create('users');
    seed.setEntries([Entry.create('admin', 'secret', undefined, true)]);
    await repository.create(seed);

    const changed = Namespace.create('users');
    changed.setEntries([Entry.create('admin', 'secret')]);
    await repository.save(changed);

    expect((await repository.findByName('users'))?.getEntry('admin').envDependent).toBe(false);
  });

  it('GIVEN env_dependent entries WHEN imported THEN the flags are stored', async () => {
    const incoming = Namespace.create('users');
    incoming.setEntries([Entry.create('db-host', 'localhost', undefined, true)]);
    await repository.importNamespaces([incoming]);

    expect((await repository.findByName('users'))?.getEntry('db-host').envDependent).toBe(true);
  });

  it('GIVEN a pre-existing row inserted without env_dependent THEN it reads back as false', async () => {
    // Proves the column default upgrades historical rows rather than
    // surfacing NULL: this INSERT omits env_dependent entirely.
    const pool = getPool();
    const [result] = await pool.query<ResultSetHeader>('INSERT INTO namespaces (name) VALUES (?)', [
      'legacy',
    ]);
    await pool.query('INSERT INTO entries (namespace_id, entry_name, value) VALUES (?, ?, ?)', [
      result.insertId,
      'admin',
      'secret',
    ]);

    const stored = await repository.findByName('legacy');
    expect(stored?.getEntry('admin').envDependent).toBe(false);
    expect(stored?.getEntry('admin').value).toBe('secret');
  });

  /**
   * These assert that the SQL list queries behave like the in-memory adapter's
   * shared semantics — same filtering, same tie-breaking, same totals — since
   * the two implementations are independent and can otherwise drift.
   */
  describe('list queries', () => {
    const namespaceQuery: NamespaceListQuery = {
      page: 1,
      page_size: 10,
      sort: 'name',
      direction: 'asc',
    };
    const entryQuery: EntryListQuery = { page: 1, page_size: 10, sort: 'name', direction: 'asc' };

    it('GIVEN namespaces WHEN a page is listed THEN it is ordered by name with totals', async () => {
      await repository.create(namespaceWith('zeta'));
      await repository.create(namespaceWith('alpha'));

      const result = await repository.listPage(namespaceQuery);
      expect(result.items.map((n) => n.name)).toEqual(['alpha', 'zeta']);
      expect(result.totalItems).toBe(2);
    });

    it('GIVEN a namespace with entries WHEN listed THEN the summary carries metadata but no entries', async () => {
      const namespace = Namespace.create('users', 'the users');
      namespace.setEntries([Entry.create('admin', 'secret')]);
      await repository.create(namespace);

      const result = await repository.listPage(namespaceQuery);
      expect(result.items[0]).toEqual({
        name: 'users',
        description: 'the users',
        createdAt: expect.any(String),
        modifiedAt: expect.any(String),
      });
    });

    it('GIVEN a namespace without a description WHEN listed THEN it maps NULL back to undefined', async () => {
      await repository.create(namespaceWith('users'));
      const result = await repository.listPage(namespaceQuery);
      expect(result.items[0].description).toBeUndefined();
    });

    it('GIVEN more namespaces than a page holds WHEN paged THEN pages slice while totals count all', async () => {
      for (const name of ['a', 'b', 'c']) {
        await repository.create(namespaceWith(name));
      }
      const result = await repository.listPage({ ...namespaceQuery, page: 2, page_size: 10 });
      expect(result.items).toEqual([]);
      expect(result.totalItems).toBe(3);
    });

    it('GIVEN namespaces WHEN listed descending THEN the order reverses', async () => {
      await repository.create(namespaceWith('alpha'));
      await repository.create(namespaceWith('zeta'));

      const result = await repository.listPage({ ...namespaceQuery, direction: 'desc' });
      expect(result.items.map((n) => n.name)).toEqual(['zeta', 'alpha']);
    });

    it('GIVEN namespaces sorted by a timestamp WHEN tied THEN ties break on ascending name', async () => {
      // Created in one batch so their created_at values collide, forcing the
      // secondary name ordering to decide.
      await repository.create(namespaceWith('b'));
      await repository.create(namespaceWith('a'));

      const result = await repository.listPage({ ...namespaceQuery, sort: 'created_at' });
      expect(result.items.map((n) => n.name)).toEqual(['a', 'b']);
    });

    it('GIVEN a name filter WHEN listed THEN it matches case-insensitively', async () => {
      await repository.create(namespaceWith('Alpha'));
      await repository.create(namespaceWith('zeta'));

      const result = await repository.listPage({ ...namespaceQuery, name: 'ALPH' });
      expect(result.items.map((n) => n.name)).toEqual(['Alpha']);
      expect(result.totalItems).toBe(1);
    });

    it('GIVEN a filter containing a LIKE wildcard WHEN listed THEN it is matched literally', async () => {
      await repository.create(namespaceWith('a_b'));
      await repository.create(namespaceWith('axb'));

      // Unescaped, `_` is a single-character wildcard and would match 'axb' too.
      const result = await repository.listPage({ ...namespaceQuery, name: 'a_b' });
      expect(result.items.map((n) => n.name)).toEqual(['a_b']);
    });

    it('GIVEN a namespace WHEN its entries are paged THEN they are ordered with totals', async () => {
      await repository.create(
        namespaceWith('users', [
          ['zeta', '1'],
          ['alpha', '2'],
        ]),
      );

      const result = await repository.listEntriesPage('users', entryQuery);
      expect(result?.items.map((e) => e.name)).toEqual(['alpha', 'zeta']);
      expect(result?.totalItems).toBe(2);
    });

    it('GIVEN entries WHEN filtered by name THEN only matches are returned', async () => {
      await repository.create(
        namespaceWith('users', [
          ['db-host', '1'],
          ['db-port', '2'],
          ['retries', '3'],
        ]),
      );

      const result = await repository.listEntriesPage('users', { ...entryQuery, name: 'DB' });
      expect(result?.items.map((e) => e.name)).toEqual(['db-host', 'db-port']);
      expect(result?.totalItems).toBe(2);
    });

    it('GIVEN entries WHEN filtered by env_dependent THEN only matching entries are returned', async () => {
      const namespace = Namespace.create('users');
      namespace.setEntries([
        Entry.create('db-host', 'localhost', undefined, true),
        Entry.create('retries', '3'),
      ]);
      await repository.create(namespace);

      const dependent = await repository.listEntriesPage('users', {
        ...entryQuery,
        env_dependent: true,
      });
      expect(dependent?.items.map((e) => e.name)).toEqual(['db-host']);

      const independent = await repository.listEntriesPage('users', {
        ...entryQuery,
        env_dependent: false,
      });
      expect(independent?.items.map((e) => e.name)).toEqual(['retries']);
    });

    it('GIVEN entries WHEN sorted by env_dependent THEN independent entries come first ascending', async () => {
      const namespace = Namespace.create('users');
      namespace.setEntries([
        Entry.create('a-dependent', 'v', undefined, true),
        Entry.create('z-independent', 'v'),
      ]);
      await repository.create(namespace);

      const result = await repository.listEntriesPage('users', {
        ...entryQuery,
        sort: 'env_dependent',
      });
      expect(result?.items.map((e) => e.name)).toEqual(['z-independent', 'a-dependent']);
    });

    it('GIVEN a listed entry WHEN read THEN it carries its stored metadata', async () => {
      const namespace = Namespace.create('users');
      namespace.setEntries([Entry.create('admin', 'secret', 'the admin', true)]);
      await repository.create(namespace);

      const result = await repository.listEntriesPage('users', entryQuery);
      expect(result?.items[0]).toMatchObject({
        name: 'admin',
        value: 'secret',
        description: 'the admin',
        envDependent: true,
      });
    });

    it('GIVEN entries in another namespace WHEN listed THEN they are excluded', async () => {
      await repository.create(namespaceWith('users', [['admin', '1']]));
      await repository.create(namespaceWith('other', [['stranger', '2']]));

      const result = await repository.listEntriesPage('users', entryQuery);
      expect(result?.items.map((e) => e.name)).toEqual(['admin']);
      expect(result?.totalItems).toBe(1);
    });

    it('GIVEN a missing namespace WHEN its entries are paged THEN it reports absence as null', async () => {
      expect(await repository.listEntriesPage('missing', entryQuery)).toBeNull();
    });
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
