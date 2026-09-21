import { describe, expect, it } from 'vitest';
import { Entry } from './entry.js';
import {
  DuplicateEntryError,
  EmptyNamespaceUpdateError,
  EntryNotFoundError,
  InvalidDescriptionError,
  InvalidResourceNameError,
} from './errors.js';
import { Namespace } from './namespace.js';

const created = new Date('2026-01-01T00:00:00.000Z');
const modified = new Date('2026-01-02T00:00:00.000Z');
const entry = (name: string, value = 'v') => Entry.create({ name, value });

describe('Namespace.create', () => {
  it('GIVEN only a name WHEN created THEN it is empty and normalized', () => {
    const ns = Namespace.create({ name: ' users ' });

    expect(ns.name).toBe('users');
    expect(ns.description).toBeUndefined();
    expect(ns.entries).toEqual([]);
    expect(ns.createdAt).toBeUndefined();
    expect(ns.modifiedAt).toBeUndefined();
  });

  it('GIVEN every field WHEN created THEN they are kept', () => {
    const ns = Namespace.create({
      name: 'users',
      description: ' docs ',
      entries: [entry('a'), entry('b')],
      createdAt: created,
      modifiedAt: modified,
    });

    expect(ns.description).toBe('docs');
    expect(ns.entries.map((e) => e.name)).toEqual(['a', 'b']);
    expect(ns.createdAt).toBe(created);
    expect(ns.modifiedAt).toBe(modified);
  });

  it('GIVEN an invalid name WHEN created THEN it is rejected', () => {
    expect(() => Namespace.create({ name: '' })).toThrow(InvalidResourceNameError);
    expect(() => Namespace.create({ name: '' })).toThrow('Namespace name must not be empty.');
  });

  it('GIVEN an oversized description WHEN created THEN it is rejected', () => {
    expect(() => Namespace.create({ name: 'n', description: 'x'.repeat(1001) })).toThrow(
      InvalidDescriptionError,
    );
  });

  it('GIVEN duplicate entry names WHEN created THEN a duplicate-entry error is thrown', () => {
    expect(() => Namespace.create({ name: 'n', entries: [entry('a'), entry('a')] })).toThrow(
      DuplicateEntryError,
    );
  });

  it('GIVEN the same entry name in two namespaces WHEN created THEN both are valid', () => {
    const one = Namespace.create({ name: 'one', entries: [entry('a')] });
    const two = Namespace.create({ name: 'two', entries: [entry('a')] });

    expect(one.hasEntry('a')).toBe(true);
    expect(two.hasEntry('a')).toBe(true);
  });
});

describe('Namespace entries', () => {
  const ns = Namespace.create({ name: 'n', entries: [entry('a'), entry('b')] });

  it('GIVEN entries WHEN looked up THEN hasEntry and getEntry find them', () => {
    expect(ns.hasEntry('a')).toBe(true);
    expect(ns.hasEntry('zzz')).toBe(false);
    expect(ns.getEntry(' a ').name).toBe('a');
  });

  it('GIVEN a missing entry WHEN fetched THEN a not-found error is thrown', () => {
    expect(() => ns.getEntry('zzz')).toThrow(EntryNotFoundError);
  });

  it('GIVEN an invalid entry name WHEN fetched THEN a validation error is thrown', () => {
    expect(() => ns.getEntry('')).toThrow(InvalidResourceNameError);
  });

  it('GIVEN a new entry WHEN added THEN a new namespace contains it and the original is unchanged', () => {
    const next = ns.addEntry(entry('c'));

    expect(next.entries.map((e) => e.name)).toEqual(['a', 'b', 'c']);
    expect(ns.entries).toHaveLength(2);
  });

  it('GIVEN an existing name WHEN added THEN a duplicate-entry error is thrown', () => {
    expect(() => ns.addEntry(entry('a'))).toThrow(DuplicateEntryError);
  });

  it('GIVEN a patch WHEN an entry is updated THEN only that entry changes', () => {
    const next = ns.updateEntry('a', { value: 'new' });

    expect(next.getEntry('a').value).toBe('new');
    expect(next.getEntry('b').value).toBe('v');
  });

  it('GIVEN the entry keeps its own name WHEN updated THEN no duplicate is reported', () => {
    expect(ns.updateEntry('a', { name: 'a', value: 'x' }).getEntry('a').value).toBe('x');
  });

  it('GIVEN an unused name WHEN an entry is renamed THEN the rename succeeds', () => {
    const next = ns.updateEntry('a', { name: 'renamed' });

    expect(next.hasEntry('renamed')).toBe(true);
    expect(next.hasEntry('a')).toBe(false);
  });

  it('GIVEN another entry name WHEN an entry is renamed to it THEN a duplicate-entry error is thrown', () => {
    expect(() => ns.updateEntry('a', { name: 'b' })).toThrow(DuplicateEntryError);
  });

  it('GIVEN a missing entry WHEN updated THEN a not-found error is thrown', () => {
    expect(() => ns.updateEntry('zzz', { value: 'x' })).toThrow(EntryNotFoundError);
  });

  it('GIVEN an entry WHEN removed THEN it is gone', () => {
    const next = ns.removeEntry('a');

    expect(next.entries.map((e) => e.name)).toEqual(['b']);
  });

  it('GIVEN a missing entry WHEN removed THEN a not-found error is thrown', () => {
    expect(() => ns.removeEntry('zzz')).toThrow(EntryNotFoundError);
  });

  it('GIVEN new entries WHEN replaced THEN name, description and timestamps are kept', () => {
    const base = Namespace.create({
      name: 'n',
      description: 'd',
      entries: [entry('a')],
      createdAt: created,
      modifiedAt: modified,
    });
    const next = base.replaceEntries([entry('x'), entry('y')]);

    expect(next.entries.map((e) => e.name)).toEqual(['x', 'y']);
    expect(next.name).toBe('n');
    expect(next.description).toBe('d');
    expect(next.createdAt).toBe(created);
    expect(next.modifiedAt).toBe(modified);
  });

  it('GIVEN duplicate replacements WHEN replaced THEN a duplicate-entry error is thrown', () => {
    expect(() => ns.replaceEntries([entry('x'), entry('x')])).toThrow(DuplicateEntryError);
  });
});

describe('Namespace.update', () => {
  const base = Namespace.create({
    name: 'n',
    description: 'd',
    entries: [entry('a')],
    createdAt: created,
    modifiedAt: modified,
  });

  it('GIVEN a name only WHEN updated THEN the description and entries are preserved', () => {
    const next = base.update({ name: 'renamed' });

    expect(next.name).toBe('renamed');
    expect(next.description).toBe('d');
    expect(next.entries).toHaveLength(1);
    expect(next.createdAt).toBe(created);
  });

  it('GIVEN a description only WHEN updated THEN the name is preserved', () => {
    const next = base.update({ description: 'new' });

    expect(next.name).toBe('n');
    expect(next.description).toBe('new');
  });

  it('GIVEN a blank description WHEN updated THEN it is cleared', () => {
    expect(base.update({ description: '   ' }).description).toBeUndefined();
  });

  it('GIVEN an empty patch WHEN updated THEN an empty-update error is thrown', () => {
    expect(() => base.update({})).toThrow(EmptyNamespaceUpdateError);
  });

  it('GIVEN an invalid name or description WHEN updated THEN it is rejected', () => {
    expect(() => base.update({ name: '!' })).toThrow(InvalidResourceNameError);
    expect(() => base.update({ description: 3 })).toThrow(InvalidDescriptionError);
  });

  it('GIVEN timestamps WHEN applied THEN the aggregate content is unchanged', () => {
    const stamped = Namespace.create({ name: 'n' }).withTimestamps(created, modified);

    expect(stamped.createdAt).toBe(created);
    expect(stamped.modifiedAt).toBe(modified);
  });
});
