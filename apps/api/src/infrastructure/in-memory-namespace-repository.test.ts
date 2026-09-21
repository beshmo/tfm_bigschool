import { DuplicateNamespaceError, Entry, Namespace, NamespaceNotFoundError } from '@okvns/domain';
import type { EntryListQuery, NamespaceListQuery } from '@okvns/shared';
import { describe, expect, it } from 'vitest';
import { steppingClock } from '../../test/create-test-app';
import { InMemoryNamespaceRepository } from './in-memory-namespace-repository';

const entry = (name: string, value = 'v', extra: Record<string, unknown> = {}) =>
  Entry.create({ name, value, ...extra });
const ns = (name: string, entries: Entry[] = [], extra: Record<string, unknown> = {}) =>
  Namespace.create({ name, entries, ...extra });
const second = (n: number) => new Date(Date.UTC(2026, 0, 1, 0, 0, n));

const namespaceQuery: NamespaceListQuery = {
  page: 1,
  pageSize: 10,
  sort: 'name',
  direction: 'asc',
};
const entryQuery: EntryListQuery = { page: 1, pageSize: 10, sort: 'name', direction: 'asc' };

function repository() {
  return new InMemoryNamespaceRepository(steppingClock());
}

describe('InMemoryNamespaceRepository timestamps', () => {
  it('GIVEN a created namespace WHEN read THEN namespace and entries carry creation and modification times', async () => {
    const repo = repository();

    const created = await repo.create(ns('a', [entry('k')]));

    expect(created.createdAt).toEqual(second(0));
    expect(created.modifiedAt).toEqual(second(0));
    expect(created.getEntry('k').createdAt).toEqual(second(0));
    expect((await repo.findByName('a'))?.getEntry('k').modifiedAt).toEqual(second(0));
  });

  it('GIVEN an entry update WHEN saved THEN entry creation stays and modification moves, as does the namespace', async () => {
    const repo = repository();
    const created = await repo.create(ns('a', [entry('k', 'old')]));

    const saved = await repo.save(created.updateEntry('k', { value: 'new' }));

    expect(saved.createdAt).toEqual(second(0));
    expect(saved.modifiedAt).toEqual(second(1));
    expect(saved.getEntry('k').createdAt).toEqual(second(0));
    expect(saved.getEntry('k').modifiedAt).toEqual(second(1));
  });

  it('GIVEN description and env_dependent updates WHEN saved THEN each refreshes modification', async () => {
    const repo = repository();
    const created = await repo.create(ns('a', [entry('k')]));

    const described = await repo.save(created.updateEntry('k', { description: 'doc' }));
    expect(described.getEntry('k').modifiedAt).toEqual(second(1));

    const flagged = await repo.save(described.updateEntry('k', { envDependent: true }));
    expect(flagged.getEntry('k').modifiedAt).toEqual(second(2));
    expect(flagged.getEntry('k').createdAt).toEqual(second(0));
  });

  it('GIVEN a save with no change WHEN persisted THEN no timestamp moves', async () => {
    const repo = repository();
    const created = await repo.create(ns('a', [entry('k')]));

    const saved = await repo.save(created);

    expect(saved.modifiedAt).toEqual(second(0));
    expect(saved.getEntry('k').modifiedAt).toEqual(second(0));
  });
});

describe('InMemoryNamespaceRepository operations', () => {
  it('GIVEN an existing name WHEN created THEN a duplicate error leaves the original', async () => {
    const repo = repository();
    await repo.create(ns('a', [], { description: 'original' }));

    await expect(repo.create(ns('a'))).rejects.toBeInstanceOf(DuplicateNamespaceError);
    expect((await repo.findByName('a'))?.description).toBe('original');
  });

  it('GIVEN a missing namespace WHEN saved THEN a not-found error is thrown', async () => {
    await expect(repository().save(ns('a'))).rejects.toBeInstanceOf(NamespaceNotFoundError);
  });

  it('GIVEN a namespace WHEN renamed THEN it moves with its entries and the old name is gone', async () => {
    const repo = repository();
    const created = await repo.create(ns('old', [entry('k')]));

    const renamed = await repo.rename('old', created.update({ name: 'new' }));

    expect(renamed.name).toBe('new');
    expect(renamed.createdAt).toEqual(second(0));
    expect(renamed.modifiedAt).toEqual(second(1));
    expect(await repo.findByName('old')).toBeUndefined();
    expect((await repo.findByName('new'))?.entries).toHaveLength(1);
  });

  it('GIVEN a taken target name WHEN renamed THEN nothing changes', async () => {
    const repo = repository();
    const a = await repo.create(ns('a'));
    await repo.create(ns('b'));

    await expect(repo.rename('a', a.update({ name: 'b' }))).rejects.toBeInstanceOf(
      DuplicateNamespaceError,
    );
    expect(await repo.findByName('a')).toBeDefined();
  });

  it('GIVEN a missing namespace WHEN renamed THEN a not-found error is thrown', async () => {
    await expect(repository().rename('nope', ns('x'))).rejects.toBeInstanceOf(
      NamespaceNotFoundError,
    );
  });

  it('GIVEN a rename to the same name WHEN applied THEN it is a plain update', async () => {
    const repo = repository();
    const created = await repo.create(ns('a'));

    const renamed = await repo.rename('a', created.update({ description: 'new' }));

    expect(renamed.name).toBe('a');
    expect(renamed.description).toBe('new');
  });

  it('GIVEN namespaces WHEN deleted THEN existence is reported', async () => {
    const repo = repository();
    await repo.create(ns('a'));

    expect(await repo.delete('a')).toBe(true);
    expect(await repo.delete('a')).toBe(false);
  });

  it('GIVEN stored data WHEN listed THEN pages, entries and the full export come back ordered', async () => {
    const repo = repository();
    await repo.create(ns('b', [entry('y'), entry('x')]));
    await repo.create(ns('a'));

    expect((await repo.listNamespaces(namespaceQuery)).items.map((item) => item.name)).toEqual([
      'a',
      'b',
    ]);
    expect((await repo.listEntries('b', entryQuery))?.items.map((item) => item.name)).toEqual([
      'x',
      'y',
    ]);
    expect(await repo.listEntries('missing', entryQuery)).toBeUndefined();
    expect((await repo.listAll()).map((item) => item.name)).toEqual(['a', 'b']);
  });

  it('GIVEN an import WHEN applied THEN new namespaces are created and existing ones replaced', async () => {
    const repo = repository();
    await repo.create(ns('a', [entry('stale')], { description: 'kept' }));

    const result = await repo.importNamespaces([ns('a', [entry('fresh')]), ns('b', [entry('k')])]);

    expect(result.map((item) => item.name)).toEqual(['a', 'b']);
    const a = await repo.findByName('a');
    expect(a?.entries.map((item) => item.name)).toEqual(['fresh']);
    expect(a?.description).toBe('kept');
    expect(a?.createdAt).toEqual(second(0));
    expect(await repo.findByName('b')).toBeDefined();
  });

  it('GIVEN an import that fails part-way WHEN applied THEN the store is unchanged', async () => {
    const repo = repository();
    await repo.create(ns('a', [entry('keep')]));
    const poisoned = ns('b') as unknown as Namespace;
    Object.defineProperty(poisoned, 'entries', {
      get() {
        throw new Error('boom');
      },
    });

    await expect(repo.importNamespaces([ns('a', [entry('fresh')]), poisoned])).rejects.toThrow(
      'boom',
    );

    expect((await repo.findByName('a'))?.entries.map((item) => item.name)).toEqual(['keep']);
    expect(await repo.findByName('b')).toBeUndefined();
  });

  it('GIVEN no injected clock WHEN used THEN the real time is stamped', async () => {
    const created = await new InMemoryNamespaceRepository().create(ns('a'));

    expect(created.createdAt).toBeInstanceOf(Date);
  });
});
