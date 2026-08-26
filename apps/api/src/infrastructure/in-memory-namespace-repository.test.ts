import { beforeEach, describe, expect, it } from 'vitest';
import { Entry, Namespace } from '@okvns/domain';
import type { EntryListQuery, NamespaceListQuery } from '@okvns/shared';
import { InMemoryNamespaceRepository } from './in-memory-namespace-repository';

/**
 * A deterministic, strictly-increasing clock so timestamp assertions never race
 * the millisecond boundary. Each call advances one second.
 */
function tickingClock(): () => string {
  let tick = 0;
  return () => new Date(Date.UTC(2020, 0, 1, 0, 0, tick++)).toISOString();
}

describe('InMemoryNamespaceRepository timestamps', () => {
  let repository: InMemoryNamespaceRepository;

  beforeEach(() => {
    repository = new InMemoryNamespaceRepository(tickingClock());
  });

  async function seedUsers(): Promise<void> {
    await repository.create(Namespace.create('users'));
  }

  it('GIVEN a created namespace WHEN read THEN it exposes matching created/modified timestamps', async () => {
    await seedUsers();
    const stored = await repository.findByName('users');
    expect(stored?.createdAt).toBe('2020-01-01T00:00:00.000Z');
    expect(stored?.modifiedAt).toBe('2020-01-01T00:00:00.000Z');
  });

  it('GIVEN an entry is created WHEN saved THEN the namespace modified timestamp advances past created', async () => {
    await seedUsers();
    const ns = (await repository.findByName('users'))!;
    ns.addEntry(Entry.create('k', 'v'));
    await repository.save(ns);

    const stored = (await repository.findByName('users'))!;
    expect(stored.createdAt).toBe('2020-01-01T00:00:00.000Z');
    expect(stored.modifiedAt > stored.createdAt).toBe(true);
    const entry = stored.getEntry('k');
    expect(entry.createdAt).toEqual(expect.any(String));
    expect(entry.modifiedAt).toBe(entry.createdAt);
  });

  it('GIVEN an entry value is updated WHEN saved THEN entry created stays stable while modified advances and namespace modified changes', async () => {
    await seedUsers();
    const first = (await repository.findByName('users'))!;
    first.addEntry(Entry.create('k', 'v'));
    await repository.save(first);

    const stored = (await repository.findByName('users'))!;
    const originalEntryCreated = stored.getEntry('k').createdAt;
    const originalNamespaceModified = stored.modifiedAt;

    stored.replaceEntry('k', Entry.create('k', 'changed'));
    await repository.save(stored);

    const updated = (await repository.findByName('users'))!;
    const entry = updated.getEntry('k');
    expect(entry.value).toBe('changed');
    expect(entry.createdAt).toBe(originalEntryCreated);
    expect(entry.modifiedAt > originalEntryCreated).toBe(true);
    expect(updated.modifiedAt > originalNamespaceModified).toBe(true);
  });

  it('GIVEN an entry is renamed WHEN saved THEN its created timestamp is preserved and modified advances', async () => {
    await seedUsers();
    const first = (await repository.findByName('users'))!;
    first.addEntry(Entry.create('old', 'v'));
    await repository.save(first);

    const stored = (await repository.findByName('users'))!;
    const originalCreated = stored.getEntry('old').createdAt;

    // Rename the entry (name change) preserving its value.
    stored.replaceEntry('old', Entry.create('new', 'v'));
    await repository.save(stored);

    const updated = (await repository.findByName('users'))!;
    expect(updated.hasEntry('old')).toBe(false);
    const renamed = updated.getEntry('new');
    expect(renamed.value).toBe('v');
    expect(renamed.createdAt).toBe(originalCreated);
    expect(renamed.modifiedAt > originalCreated).toBe(true);
  });

  it('GIVEN an unchanged entry alongside a changed one WHEN saved THEN only the changed entry modified timestamp advances', async () => {
    await seedUsers();
    const seed = (await repository.findByName('users'))!;
    seed.addEntry(Entry.create('stable', 'v'));
    seed.addEntry(Entry.create('changing', 'v'));
    await repository.save(seed);

    const stored = (await repository.findByName('users'))!;
    const stableModified = stored.getEntry('stable').modifiedAt;

    stored.replaceEntry('changing', Entry.create('changing', 'v2'));
    await repository.save(stored);

    const updated = (await repository.findByName('users'))!;
    expect(updated.getEntry('stable').modifiedAt).toBe(stableModified);
    expect(updated.getEntry('changing').modifiedAt > stableModified).toBe(true);
  });

  it('GIVEN an entry description is updated WHEN saved THEN entry created stays stable while modified advances', async () => {
    await seedUsers();
    const seed = (await repository.findByName('users'))!;
    seed.addEntry(Entry.create('k', 'v', 'original'));
    await repository.save(seed);

    const stored = (await repository.findByName('users'))!;
    const originalCreated = stored.getEntry('k').createdAt;
    const originalNamespaceModified = stored.modifiedAt;

    stored.replaceEntry('k', Entry.create('k', 'v', 'changed'));
    await repository.save(stored);

    const updated = (await repository.findByName('users'))!;
    const entry = updated.getEntry('k');
    expect(entry.description).toBe('changed');
    expect(entry.value).toBe('v');
    expect(entry.createdAt).toBe(originalCreated);
    expect(entry.modifiedAt > originalCreated).toBe(true);
    expect(updated.modifiedAt > originalNamespaceModified).toBe(true);
  });

  it('GIVEN an entry description is cleared WHEN saved THEN the modified timestamp advances', async () => {
    await seedUsers();
    const seed = (await repository.findByName('users'))!;
    seed.addEntry(Entry.create('k', 'v', 'docs'));
    await repository.save(seed);

    const stored = (await repository.findByName('users'))!;
    const beforeModified = stored.getEntry('k').modifiedAt;

    stored.replaceEntry('k', Entry.create('k', 'v'));
    await repository.save(stored);

    const updated = (await repository.findByName('users'))!;
    expect(updated.getEntry('k').description).toBeUndefined();
    expect(updated.getEntry('k').modifiedAt > beforeModified).toBe(true);
  });

  it('GIVEN a namespace description WHEN saved and read back THEN it is preserved', async () => {
    await repository.create(Namespace.create('docs', 'the docs'));
    const stored = (await repository.findByName('docs'))!;
    expect(stored.description).toBe('the docs');

    stored.describe('updated docs');
    await repository.save(stored);
    expect((await repository.findByName('docs'))?.description).toBe('updated docs');
  });

  it('GIVEN a namespace with a description WHEN renamed THEN the description is preserved', async () => {
    await repository.create(Namespace.create('users', 'the users'));
    await repository.rename('users', 'people');
    expect((await repository.findByName('people'))?.description).toBe('the users');
  });

  it('GIVEN descriptions WHEN imported THEN namespace and entry descriptions are stored', async () => {
    const incoming = Namespace.create('users', 'ns doc');
    incoming.addEntry(Entry.create('k', 'v', 'entry doc'));
    await repository.importNamespaces([incoming]);

    const stored = (await repository.findByName('users'))!;
    expect(stored.description).toBe('ns doc');
    expect(stored.getEntry('k').description).toBe('entry doc');
  });

  it('GIVEN an entry env_dependent is updated WHEN saved THEN entry created stays stable while modified advances', async () => {
    await seedUsers();
    const seed = (await repository.findByName('users'))!;
    seed.addEntry(Entry.create('k', 'v', 'docs'));
    await repository.save(seed);

    const stored = (await repository.findByName('users'))!;
    const originalCreated = stored.getEntry('k').createdAt;
    const originalNamespaceModified = stored.modifiedAt;

    stored.replaceEntry('k', Entry.create('k', 'v', 'docs', true));
    await repository.save(stored);

    const updated = (await repository.findByName('users'))!;
    const entry = updated.getEntry('k');
    expect(entry.envDependent).toBe(true);
    expect(entry.value).toBe('v');
    expect(entry.description).toBe('docs');
    expect(entry.createdAt).toBe(originalCreated);
    expect(entry.modifiedAt > originalCreated).toBe(true);
    expect(updated.modifiedAt > originalNamespaceModified).toBe(true);
  });

  it('GIVEN an unchanged env-dependent entry WHEN saved THEN its timestamps are untouched', async () => {
    await seedUsers();
    const seed = (await repository.findByName('users'))!;
    seed.addEntry(Entry.create('k', 'v', undefined, true));
    await repository.save(seed);

    const stored = (await repository.findByName('users'))!;
    const beforeModified = stored.getEntry('k').modifiedAt;

    await repository.save(stored);

    const updated = (await repository.findByName('users'))!;
    expect(updated.getEntry('k').envDependent).toBe(true);
    expect(updated.getEntry('k').modifiedAt).toBe(beforeModified);
  });

  it('GIVEN env_dependent entries WHEN imported THEN the flags are stored', async () => {
    const incoming = Namespace.create('users');
    incoming.addEntry(Entry.create('db-host', 'localhost', undefined, true));
    incoming.addEntry(Entry.create('retries', '3'));
    await repository.importNamespaces([incoming]);

    const stored = (await repository.findByName('users'))!;
    expect(stored.getEntry('db-host').envDependent).toBe(true);
    expect(stored.getEntry('retries').envDependent).toBe(false);
  });

  it('GIVEN an entry is deleted WHEN saved THEN the namespace modified timestamp changes', async () => {
    await seedUsers();
    const seed = (await repository.findByName('users'))!;
    seed.addEntry(Entry.create('k', 'v'));
    await repository.save(seed);

    const stored = (await repository.findByName('users'))!;
    const beforeDeleteModified = stored.modifiedAt;

    stored.removeEntry('k');
    await repository.save(stored);

    const updated = (await repository.findByName('users'))!;
    expect(updated.hasEntry('k')).toBe(false);
    expect(updated.modifiedAt > beforeDeleteModified).toBe(true);
  });

  it('GIVEN a rename WHEN applied THEN created is preserved and modified advances', async () => {
    await seedUsers();
    const created = (await repository.findByName('users'))!.createdAt;

    await repository.rename('users', 'people');

    const renamed = (await repository.findByName('people'))!;
    expect(renamed.createdAt).toBe(created);
    expect(renamed.modifiedAt > created).toBe(true);
  });

  it('GIVEN an import re-applies a namespace WHEN read THEN entries carry timestamps and namespace modified refreshes', async () => {
    await seedUsers();
    const original = (await repository.findByName('users'))!.createdAt;

    const incoming = Namespace.create('users');
    incoming.addEntry(Entry.create('fresh', '1'));
    await repository.importNamespaces([incoming]);

    const stored = (await repository.findByName('users'))!;
    expect(stored.createdAt).toBe(original);
    expect(stored.modifiedAt > original).toBe(true);
    expect(stored.getEntry('fresh').createdAt).toEqual(expect.any(String));
  });
});

/**
 * The filter/order/page semantics themselves live in the application layer's
 * shared list-query helpers and are covered there; these cover what the adapter
 * itself owns — applying the query to the store and detaching what it hands out.
 */
describe('InMemoryNamespaceRepository list queries', () => {
  let repository: InMemoryNamespaceRepository;

  const namespaceQuery: NamespaceListQuery = {
    page: 1,
    page_size: 10,
    sort: 'name',
    direction: 'asc',
  };
  const entryQuery: EntryListQuery = { page: 1, page_size: 10, sort: 'name', direction: 'asc' };

  beforeEach(() => {
    repository = new InMemoryNamespaceRepository(tickingClock());
  });

  it('GIVEN stored namespaces WHEN a page is listed THEN it is filtered, ordered, and totalled', async () => {
    await repository.create(Namespace.create('zeta'));
    await repository.create(Namespace.create('alpha'));
    await repository.create(Namespace.create('other'));

    const result = await repository.listPage({ ...namespaceQuery, name: 'a' });
    expect(result.items.map((n) => n.name)).toEqual(['alpha', 'zeta']);
    expect(result.totalItems).toBe(2);
  });

  it('GIVEN a namespace with entries WHEN listed THEN its summary carries metadata but no entries', async () => {
    const namespace = Namespace.create('users', 'the users');
    namespace.addEntry(Entry.create('admin', 'secret'));
    await repository.create(namespace);

    const result = await repository.listPage(namespaceQuery);
    expect(result.items[0]).toEqual({
      name: 'users',
      description: 'the users',
      createdAt: expect.any(String),
      modifiedAt: expect.any(String),
    });
  });

  it('GIVEN more namespaces than a page holds WHEN paged THEN each page slices the ordered result', async () => {
    for (const name of ['a', 'b', 'c']) {
      await repository.create(Namespace.create(name));
    }
    const paged = { ...namespaceQuery, page_size: 10 as const, page: 2 };
    const result = await repository.listPage(paged);
    expect(result.items).toEqual([]);
    expect(result.totalItems).toBe(3);
  });

  it('GIVEN a namespace WHEN its entries are paged THEN they are filtered and totalled', async () => {
    const namespace = Namespace.create('users');
    namespace.addEntry(Entry.create('db-host', 'localhost', undefined, true));
    namespace.addEntry(Entry.create('db-port', '5432'));
    namespace.addEntry(Entry.create('retries', '3'));
    await repository.create(namespace);

    const result = await repository.listEntriesPage('users', { ...entryQuery, name: 'db' });
    expect(result?.items.map((e) => e.name)).toEqual(['db-host', 'db-port']);
    expect(result?.totalItems).toBe(2);

    const dependent = await repository.listEntriesPage('users', {
      ...entryQuery,
      env_dependent: true,
    });
    expect(dependent?.items.map((e) => e.name)).toEqual(['db-host']);
  });

  it('GIVEN a missing namespace WHEN its entries are paged THEN it reports absence as null', async () => {
    expect(await repository.listEntriesPage('missing', entryQuery)).toBeNull();
  });

  it('GIVEN a listed entry WHEN mutated THEN the stored namespace is unaffected', async () => {
    const namespace = Namespace.create('users');
    namespace.addEntry(Entry.create('admin', 'secret'));
    await repository.create(namespace);

    const page = await repository.listEntriesPage('users', entryQuery);
    page!.items[0].stamp('1999-01-01T00:00:00.000Z', '1999-01-01T00:00:00.000Z');

    const stored = await repository.findByName('users');
    expect(stored!.getEntry('admin').createdAt).not.toBe('1999-01-01T00:00:00.000Z');
  });
});
