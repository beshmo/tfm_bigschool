import { afterEach, describe, expect, it, vi } from 'vitest';
import { Namespace, compareNames } from './namespace.js';
import { Entry } from './entry.js';
import {
  DuplicateEntryError,
  EntryNotFoundError,
  InvalidDescriptionError,
  InvalidResourceNameError,
} from './errors.js';

const ISO = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/;

describe('Namespace', () => {
  afterEach(() => {
    vi.useRealTimers();
  });

  it('GIVEN a valid name WHEN created THEN it is normalized and has no entries', () => {
    const ns = Namespace.create('  settings  ');
    expect(ns.name).toBe('settings');
    expect(ns.listEntries()).toEqual([]);
  });

  it('GIVEN a new namespace WHEN created THEN it carries matching ISO timestamps', () => {
    const ns = Namespace.create('settings');
    expect(ns.createdAt).toMatch(ISO);
    expect(ns.modifiedAt).toBe(ns.createdAt);
  });

  it('GIVEN an invalid name WHEN created THEN it throws', () => {
    expect(() => Namespace.create('bad name')).toThrow(InvalidResourceNameError);
  });

  it('GIVEN a namespace WHEN renamed THEN the name changes, entries are preserved, and modification refreshes', () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-01-01T00:00:00.000Z'));
    const ns = Namespace.create('a');
    ns.addEntry(Entry.create('k', 'v'));
    const createdAt = ns.createdAt;
    vi.setSystemTime(new Date('2026-02-01T00:00:00.000Z'));
    ns.rename('b');
    expect(ns.name).toBe('b');
    expect(ns.listEntries().map((e) => e.name)).toEqual(['k']);
    expect(ns.createdAt).toBe(createdAt);
    expect(ns.modifiedAt).toBe('2026-02-01T00:00:00.000Z');
  });

  it('GIVEN a new entry WHEN added THEN it is retrievable and modification refreshes', () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-01-01T00:00:00.000Z'));
    const ns = Namespace.create('a');
    vi.setSystemTime(new Date('2026-03-01T00:00:00.000Z'));
    ns.addEntry(Entry.create('k', 'v'));
    expect(ns.hasEntry('k')).toBe(true);
    expect(ns.getEntry('k').value).toBe('v');
    expect(ns.modifiedAt).toBe('2026-03-01T00:00:00.000Z');
  });

  it('GIVEN an existing entry name WHEN a duplicate is added THEN it throws DuplicateEntryError', () => {
    const ns = Namespace.create('a');
    ns.addEntry(Entry.create('k', 'v'));
    expect(() => ns.addEntry(Entry.create('k', 'other'))).toThrow(DuplicateEntryError);
  });

  it('GIVEN the same entry name in different namespaces WHEN added THEN both remain valid', () => {
    const a = Namespace.create('a');
    const b = Namespace.create('b');
    a.addEntry(Entry.create('shared', '1'));
    b.addEntry(Entry.create('shared', '2'));
    expect(a.getEntry('shared').value).toBe('1');
    expect(b.getEntry('shared').value).toBe('2');
  });

  it('GIVEN a missing entry WHEN retrieved THEN it throws EntryNotFoundError', () => {
    expect(() => Namespace.create('a').getEntry('missing')).toThrow(EntryNotFoundError);
  });

  it('GIVEN a missing entry WHEN removed THEN it throws EntryNotFoundError', () => {
    expect(() => Namespace.create('a').removeEntry('missing')).toThrow(EntryNotFoundError);
  });

  it('GIVEN an existing entry WHEN removed THEN it is gone and modification refreshes', () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-01-01T00:00:00.000Z'));
    const ns = Namespace.create('a');
    ns.addEntry(Entry.create('k', 'v'));
    vi.setSystemTime(new Date('2026-04-01T00:00:00.000Z'));
    ns.removeEntry('k');
    expect(ns.hasEntry('k')).toBe(false);
    expect(ns.modifiedAt).toBe('2026-04-01T00:00:00.000Z');
  });

  it('GIVEN an entry WHEN replaced with a new value THEN the value updates, creation is preserved, and modification refreshes', () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-01-01T00:00:00.000Z'));
    const ns = Namespace.create('a');
    ns.addEntry(Entry.create('k', 'v'));
    const originalCreated = ns.getEntry('k').createdAt;
    vi.setSystemTime(new Date('2026-05-01T00:00:00.000Z'));
    ns.replaceEntry('k', Entry.create('k', 'v2'));
    expect(ns.getEntry('k').value).toBe('v2');
    expect(ns.getEntry('k').createdAt).toBe(originalCreated);
    expect(ns.getEntry('k').modifiedAt).toBe('2026-05-01T00:00:00.000Z');
    expect(ns.modifiedAt).toBe('2026-05-01T00:00:00.000Z');
  });

  it('GIVEN an entry WHEN replaced with a new name THEN it is re-keyed and its creation time is preserved', () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-01-01T00:00:00.000Z'));
    const ns = Namespace.create('a');
    ns.addEntry(Entry.create('k', 'v'));
    const originalCreated = ns.getEntry('k').createdAt;
    vi.setSystemTime(new Date('2026-06-01T00:00:00.000Z'));
    ns.replaceEntry('k', Entry.create('k2', 'v'));
    expect(ns.hasEntry('k')).toBe(false);
    expect(ns.getEntry('k2').value).toBe('v');
    expect(ns.getEntry('k2').createdAt).toBe(originalCreated);
    expect(ns.getEntry('k2').modifiedAt).toBe('2026-06-01T00:00:00.000Z');
  });

  it('GIVEN a missing original entry WHEN replaced THEN it throws EntryNotFoundError', () => {
    const ns = Namespace.create('a');
    expect(() => ns.replaceEntry('missing', Entry.create('k', 'v'))).toThrow(EntryNotFoundError);
  });

  it('GIVEN a rename to a name used by another entry WHEN replaced THEN it throws DuplicateEntryError', () => {
    const ns = Namespace.create('a');
    ns.addEntry(Entry.create('k', 'v'));
    ns.addEntry(Entry.create('other', 'v'));
    expect(() => ns.replaceEntry('k', Entry.create('other', 'v'))).toThrow(DuplicateEntryError);
  });

  it('GIVEN unsorted entries WHEN listed THEN they are returned in deterministic name order', () => {
    const ns = Namespace.create('a');
    ns.addEntry(Entry.create('zeta', '1'));
    ns.addEntry(Entry.create('alpha', '2'));
    ns.addEntry(Entry.create('mid', '3'));
    expect(ns.listEntries().map((e) => e.name)).toEqual(['alpha', 'mid', 'zeta']);
  });

  it('GIVEN entries WHEN setEntries is called THEN it replaces all entries', () => {
    const ns = Namespace.create('a');
    ns.addEntry(Entry.create('old', '1'));
    ns.setEntries([Entry.create('new', '2')]);
    expect(ns.listEntries().map((e) => e.name)).toEqual(['new']);
  });

  it('GIVEN duplicate entries WHEN setEntries is called THEN it throws DuplicateEntryError', () => {
    const ns = Namespace.create('a');
    expect(() => ns.setEntries([Entry.create('k', '1'), Entry.create('k', '2')])).toThrow(
      DuplicateEntryError,
    );
  });

  it('GIVEN stored state WHEN rehydrated THEN name, timestamps, and entries are restored without a fresh mutation', () => {
    const entry = Entry.rehydrate('k', 'v', '2020-01-01T00:00:00.000Z', '2020-06-01T00:00:00.000Z');
    const ns = Namespace.rehydrate('a', '2019-01-01T00:00:00.000Z', '2021-01-01T00:00:00.000Z', [
      entry,
    ]);
    expect(ns.name).toBe('a');
    expect(ns.createdAt).toBe('2019-01-01T00:00:00.000Z');
    expect(ns.modifiedAt).toBe('2021-01-01T00:00:00.000Z');
    expect(ns.getEntry('k').value).toBe('v');
  });

  it('GIVEN a valid description WHEN created THEN it is trimmed and kept', () => {
    expect(Namespace.create('a', '  app settings  ').description).toBe('app settings');
  });

  it('GIVEN no description WHEN created THEN the description is absent', () => {
    expect(Namespace.create('a').description).toBeUndefined();
  });

  it('GIVEN a whitespace-only description WHEN created THEN it normalizes to absent', () => {
    expect(Namespace.create('a', '  \t ').description).toBeUndefined();
  });

  it('GIVEN a non-string description WHEN created THEN it throws InvalidDescriptionError', () => {
    expect(() => Namespace.create('a', { bad: true })).toThrow(InvalidDescriptionError);
  });

  it('GIVEN a description at the max length WHEN created THEN it is accepted', () => {
    expect(Namespace.create('a', 'x'.repeat(1000)).description).toHaveLength(1000);
  });

  it('GIVEN a description over the max length WHEN created THEN it throws InvalidDescriptionError', () => {
    expect(() => Namespace.create('a', 'x'.repeat(1001))).toThrow(InvalidDescriptionError);
  });

  it('GIVEN a namespace WHEN described THEN the description changes and modification refreshes', () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-01-01T00:00:00.000Z'));
    const ns = Namespace.create('a', 'old');
    const createdAt = ns.createdAt;
    vi.setSystemTime(new Date('2026-07-01T00:00:00.000Z'));
    ns.describe('new');
    expect(ns.description).toBe('new');
    expect(ns.createdAt).toBe(createdAt);
    expect(ns.modifiedAt).toBe('2026-07-01T00:00:00.000Z');
  });

  it('GIVEN a namespace with a description WHEN described with a blank value THEN it is cleared and modification refreshes', () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-01-01T00:00:00.000Z'));
    const ns = Namespace.create('a', 'old');
    vi.setSystemTime(new Date('2026-08-01T00:00:00.000Z'));
    ns.describe('   ');
    expect(ns.description).toBeUndefined();
    expect(ns.modifiedAt).toBe('2026-08-01T00:00:00.000Z');
  });

  it('GIVEN an invalid description WHEN described THEN it throws InvalidDescriptionError', () => {
    expect(() => Namespace.create('a').describe('x'.repeat(1001))).toThrow(InvalidDescriptionError);
  });

  it('GIVEN a renamed namespace WHEN inspected THEN the description is preserved', () => {
    const ns = Namespace.create('a', 'docs');
    ns.rename('b');
    expect(ns.description).toBe('docs');
  });

  it('GIVEN stored state with a description WHEN rehydrated THEN the description is restored', () => {
    const ns = Namespace.rehydrate(
      'a',
      '2019-01-01T00:00:00.000Z',
      '2021-01-01T00:00:00.000Z',
      [],
      'docs',
    );
    expect(ns.description).toBe('docs');
  });

  it('GIVEN a namespace with descriptions WHEN cloned THEN namespace and entry descriptions are copied', () => {
    const ns = Namespace.rehydrate(
      'a',
      '2019-01-01T00:00:00.000Z',
      '2021-01-01T00:00:00.000Z',
      [
        Entry.rehydrate(
          'k',
          'v',
          '2020-01-01T00:00:00.000Z',
          '2020-06-01T00:00:00.000Z',
          'entry doc',
        ),
      ],
      'ns doc',
    );
    const copy = ns.clone();
    expect(copy.description).toBe('ns doc');
    expect(copy.getEntry('k').description).toBe('entry doc');
  });

  it('GIVEN an env-dependent entry WHEN the namespace is cloned THEN the flag is copied', () => {
    const ns = Namespace.rehydrate('a', '2019-01-01T00:00:00.000Z', '2021-01-01T00:00:00.000Z', [
      Entry.rehydrate(
        'k',
        'v',
        '2020-01-01T00:00:00.000Z',
        '2020-06-01T00:00:00.000Z',
        undefined,
        true,
      ),
    ]);
    expect(ns.clone().getEntry('k').envDependent).toBe(true);
  });

  it('GIVEN a namespace with a description WHEN converted to DTO THEN the description is included', () => {
    const ns = Namespace.rehydrate(
      'a',
      '2019-01-01T00:00:00.000Z',
      '2021-01-01T00:00:00.000Z',
      [],
      'docs',
    );
    expect(ns.toDto()).toEqual({
      name: 'a',
      description: 'docs',
      created_at: '2019-01-01T00:00:00.000Z',
      modified_at: '2021-01-01T00:00:00.000Z',
      entries: [],
    });
  });

  it('GIVEN a namespace WHEN stamped THEN its timestamps are overwritten', () => {
    const ns = Namespace.create('a');
    ns.stamp('2020-01-01T00:00:00.000Z', '2022-01-01T00:00:00.000Z');
    expect(ns.createdAt).toBe('2020-01-01T00:00:00.000Z');
    expect(ns.modifiedAt).toBe('2022-01-01T00:00:00.000Z');
  });

  it('GIVEN a namespace WHEN cloned THEN it copies name, timestamps, and independent entries', () => {
    const ns = Namespace.rehydrate('a', '2019-01-01T00:00:00.000Z', '2021-01-01T00:00:00.000Z', [
      Entry.rehydrate('k', 'v', '2020-01-01T00:00:00.000Z', '2020-06-01T00:00:00.000Z'),
    ]);
    const copy = ns.clone();
    expect(copy.toDto()).toEqual(ns.toDto());
    // Mutating the clone does not affect the original.
    copy.addEntry(Entry.create('extra', '1'));
    expect(ns.hasEntry('extra')).toBe(false);
  });

  it('GIVEN two names WHEN compared THEN ordering is deterministic', () => {
    expect(compareNames('a', 'b')).toBe(-1);
    expect(compareNames('b', 'a')).toBe(1);
    expect(compareNames('a', 'a')).toBe(0);
  });

  it('GIVEN a namespace WHEN converted to DTO THEN entries are sorted and timestamps are exposed', () => {
    const ns = Namespace.rehydrate('a', '2019-01-01T00:00:00.000Z', '2021-01-01T00:00:00.000Z', [
      Entry.rehydrate('b', '2', '2020-01-01T00:00:00.000Z', '2020-01-01T00:00:00.000Z'),
      Entry.rehydrate('a', '1', '2020-01-01T00:00:00.000Z', '2020-01-01T00:00:00.000Z'),
    ]);
    expect(ns.toDto()).toEqual({
      name: 'a',
      created_at: '2019-01-01T00:00:00.000Z',
      modified_at: '2021-01-01T00:00:00.000Z',
      entries: [
        {
          name: 'a',
          value: '1',
          env_dependent: false,
          created_at: '2020-01-01T00:00:00.000Z',
          modified_at: '2020-01-01T00:00:00.000Z',
        },
        {
          name: 'b',
          value: '2',
          env_dependent: false,
          created_at: '2020-01-01T00:00:00.000Z',
          modified_at: '2020-01-01T00:00:00.000Z',
        },
      ],
    });
  });
});
