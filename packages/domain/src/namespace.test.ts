import { describe, expect, it } from 'vitest';
import { Namespace, compareNames } from './namespace.js';
import { Entry } from './entry.js';
import { DuplicateEntryError, EntryNotFoundError, InvalidResourceNameError } from './errors.js';

describe('Namespace', () => {
  it('GIVEN a valid name WHEN created THEN it is normalized and has no entries', () => {
    const ns = Namespace.create('  settings  ');
    expect(ns.name).toBe('settings');
    expect(ns.listEntries()).toEqual([]);
  });

  it('GIVEN an invalid name WHEN created THEN it throws', () => {
    expect(() => Namespace.create('bad name')).toThrow(InvalidResourceNameError);
  });

  it('GIVEN a namespace WHEN renamed THEN the name changes and entries are preserved', () => {
    const ns = Namespace.create('a');
    ns.addEntry(Entry.create('k', 'v'));
    ns.rename('b');
    expect(ns.name).toBe('b');
    expect(ns.listEntries().map((e) => e.name)).toEqual(['k']);
  });

  it('GIVEN a new entry WHEN added THEN it is retrievable', () => {
    const ns = Namespace.create('a');
    ns.addEntry(Entry.create('k', 'v'));
    expect(ns.hasEntry('k')).toBe(true);
    expect(ns.getEntry('k').value).toBe('v');
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

  it('GIVEN an existing entry WHEN removed THEN it is gone', () => {
    const ns = Namespace.create('a');
    ns.addEntry(Entry.create('k', 'v'));
    ns.removeEntry('k');
    expect(ns.hasEntry('k')).toBe(false);
  });

  it('GIVEN an entry WHEN replaced with a new value THEN the value updates', () => {
    const ns = Namespace.create('a');
    ns.addEntry(Entry.create('k', 'v'));
    ns.replaceEntry('k', Entry.create('k', 'v2'));
    expect(ns.getEntry('k').value).toBe('v2');
  });

  it('GIVEN an entry WHEN replaced with a new name THEN it is re-keyed', () => {
    const ns = Namespace.create('a');
    ns.addEntry(Entry.create('k', 'v'));
    ns.replaceEntry('k', Entry.create('k2', 'v'));
    expect(ns.hasEntry('k')).toBe(false);
    expect(ns.getEntry('k2').value).toBe('v');
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

  it('GIVEN two names WHEN compared THEN ordering is deterministic', () => {
    expect(compareNames('a', 'b')).toBe(-1);
    expect(compareNames('b', 'a')).toBe(1);
    expect(compareNames('a', 'a')).toBe(0);
  });

  it('GIVEN a namespace WHEN converted to DTO THEN entries are sorted and mapped', () => {
    const ns = Namespace.create('a');
    ns.addEntry(Entry.create('b', '2'));
    ns.addEntry(Entry.create('a', '1'));
    expect(ns.toDto()).toEqual({
      name: 'a',
      entries: [
        { name: 'a', value: '1' },
        { name: 'b', value: '2' },
      ],
    });
  });
});
