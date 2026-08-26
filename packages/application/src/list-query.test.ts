import { describe, expect, it } from 'vitest';
import { Entry, Namespace } from '@okvns/domain';
import type { EntryListQuery, NamespaceListQuery } from '@okvns/shared';
import { queryEntries, queryNamespaces } from './list-query.js';

const namespaceQuery: NamespaceListQuery = {
  page: 1,
  page_size: 10,
  sort: 'name',
  direction: 'asc',
};

const entryQuery: EntryListQuery = { page: 1, page_size: 10, sort: 'name', direction: 'asc' };

/** Builds a namespace stamped with fixed timestamps, so ordering is decidable. */
function namespaceAt(name: string, createdAt: string, modifiedAt = createdAt): Namespace {
  const namespace = Namespace.create(name);
  namespace.stamp(createdAt, modifiedAt);
  return namespace;
}

function entryAt(
  name: string,
  createdAt: string,
  modifiedAt = createdAt,
  envDependent = false,
): Entry {
  const entry = Entry.create(name, 'v', undefined, envDependent);
  entry.stamp(createdAt, modifiedAt);
  return entry;
}

describe('queryNamespaces', () => {
  const namespaces = [
    namespaceAt('zeta', '2024-01-03T00:00:00.000Z'),
    namespaceAt('alpha', '2024-01-01T00:00:00.000Z'),
    namespaceAt('Beta', '2024-01-02T00:00:00.000Z'),
  ];

  it('GIVEN namespaces WHEN sorted by name ascending THEN they are ordered deterministically', () => {
    const result = queryNamespaces(namespaces, namespaceQuery);
    expect(result.items.map((n) => n.name)).toEqual(['Beta', 'alpha', 'zeta']);
    expect(result.totalItems).toBe(3);
  });

  it('GIVEN namespaces WHEN sorted descending THEN the order is reversed', () => {
    const result = queryNamespaces(namespaces, { ...namespaceQuery, direction: 'desc' });
    expect(result.items.map((n) => n.name)).toEqual(['zeta', 'alpha', 'Beta']);
  });

  it('GIVEN namespaces WHEN sorted by created_at THEN they follow creation order', () => {
    const result = queryNamespaces(namespaces, { ...namespaceQuery, sort: 'created_at' });
    expect(result.items.map((n) => n.name)).toEqual(['alpha', 'Beta', 'zeta']);
  });

  it('GIVEN namespaces WHEN sorted by modified_at THEN they follow modification order', () => {
    const rows = [
      namespaceAt('a', '2024-01-01T00:00:00.000Z', '2024-02-03T00:00:00.000Z'),
      namespaceAt('b', '2024-01-01T00:00:00.000Z', '2024-02-01T00:00:00.000Z'),
    ];
    const result = queryNamespaces(rows, { ...namespaceQuery, sort: 'modified_at' });
    expect(result.items.map((n) => n.name)).toEqual(['b', 'a']);
  });

  it('GIVEN equal sort values WHEN ordered in either direction THEN ties break on ascending name', () => {
    const tied = [
      namespaceAt('b', '2024-01-01T00:00:00.000Z'),
      namespaceAt('a', '2024-01-01T00:00:00.000Z'),
    ];
    const ascending = queryNamespaces(tied, { ...namespaceQuery, sort: 'created_at' });
    expect(ascending.items.map((n) => n.name)).toEqual(['a', 'b']);
    const descending = queryNamespaces(tied, {
      ...namespaceQuery,
      sort: 'created_at',
      direction: 'desc',
    });
    expect(descending.items.map((n) => n.name)).toEqual(['a', 'b']);
  });

  it('GIVEN a name filter WHEN applied THEN it matches case-insensitive substrings only', () => {
    const result = queryNamespaces(namespaces, { ...namespaceQuery, name: 'ET' });
    expect(result.items.map((n) => n.name)).toEqual(['Beta', 'zeta']);
    expect(result.totalItems).toBe(2);
  });

  it('GIVEN a page beyond the first WHEN requested THEN it slices while totals count all matches', () => {
    const result = queryNamespaces(namespaces, { ...namespaceQuery, page: 2, page_size: 10 });
    expect(result.items).toEqual([]);
    expect(result.totalItems).toBe(3);
  });

  it('GIVEN more rows than a page holds WHEN paged THEN each page carries its own slice', () => {
    const rows = ['a', 'b', 'c'].map((name) => namespaceAt(name, '2024-01-01T00:00:00.000Z'));
    const small = { ...namespaceQuery, page_size: 10 as const };
    expect(queryNamespaces(rows, small).items.map((n) => n.name)).toEqual(['a', 'b', 'c']);
  });

  it('GIVEN a namespace with entries WHEN listed THEN the summary carries no entries', () => {
    const namespace = Namespace.create('users');
    namespace.addEntry(Entry.create('admin', 'secret'));
    // Stamped after the entry is added, since adding one refreshes the
    // namespace's modification time.
    namespace.stamp('2024-01-01T00:00:00.000Z', '2024-01-01T00:00:00.000Z');
    const result = queryNamespaces([namespace], namespaceQuery);
    expect(result.items[0]).toEqual({
      name: 'users',
      description: undefined,
      createdAt: '2024-01-01T00:00:00.000Z',
      modifiedAt: '2024-01-01T00:00:00.000Z',
    });
  });

  it('GIVEN the source array WHEN queried THEN it is not reordered in place', () => {
    const rows = [
      namespaceAt('z', '2024-01-01T00:00:00.000Z'),
      namespaceAt('a', '2024-01-02T00:00:00.000Z'),
    ];
    queryNamespaces(rows, namespaceQuery);
    expect(rows.map((n) => n.name)).toEqual(['z', 'a']);
  });
});

describe('queryEntries', () => {
  const entries = [
    entryAt('zeta', '2024-01-03T00:00:00.000Z', '2024-01-03T00:00:00.000Z', true),
    entryAt('alpha', '2024-01-01T00:00:00.000Z'),
    entryAt('Beta', '2024-01-02T00:00:00.000Z'),
  ];

  it('GIVEN entries WHEN sorted by name THEN they are ordered deterministically', () => {
    const result = queryEntries(entries, entryQuery);
    expect(result.items.map((e) => e.name)).toEqual(['Beta', 'alpha', 'zeta']);
    expect(result.totalItems).toBe(3);
  });

  it('GIVEN entries WHEN sorted by created_at THEN they follow creation order', () => {
    const result = queryEntries(entries, { ...entryQuery, sort: 'created_at' });
    expect(result.items.map((e) => e.name)).toEqual(['alpha', 'Beta', 'zeta']);
  });

  it('GIVEN entries WHEN sorted by modified_at THEN they follow modification order', () => {
    const rows = [
      entryAt('a', '2024-01-01T00:00:00.000Z', '2024-02-03T00:00:00.000Z'),
      entryAt('b', '2024-01-01T00:00:00.000Z', '2024-02-01T00:00:00.000Z'),
    ];
    const result = queryEntries(rows, { ...entryQuery, sort: 'modified_at' });
    expect(result.items.map((e) => e.name)).toEqual(['b', 'a']);
  });

  it('GIVEN entries WHEN sorted by env_dependent THEN ascending puts independent entries first', () => {
    const result = queryEntries(entries, { ...entryQuery, sort: 'env_dependent' });
    expect(result.items.map((e) => e.name)).toEqual(['Beta', 'alpha', 'zeta']);
    const descending = queryEntries(entries, {
      ...entryQuery,
      sort: 'env_dependent',
      direction: 'desc',
    });
    expect(descending.items.map((e) => e.name)).toEqual(['zeta', 'Beta', 'alpha']);
  });

  it('GIVEN a name filter WHEN applied THEN it matches case-insensitive substrings only', () => {
    const result = queryEntries(entries, { ...entryQuery, name: 'ET' });
    expect(result.items.map((e) => e.name)).toEqual(['Beta', 'zeta']);
  });

  it('GIVEN an env_dependent filter WHEN true THEN only dependent entries match', () => {
    const result = queryEntries(entries, { ...entryQuery, env_dependent: true });
    expect(result.items.map((e) => e.name)).toEqual(['zeta']);
    expect(result.totalItems).toBe(1);
  });

  it('GIVEN an env_dependent filter WHEN false THEN only independent entries match', () => {
    const result = queryEntries(entries, { ...entryQuery, env_dependent: false });
    expect(result.items.map((e) => e.name)).toEqual(['Beta', 'alpha']);
  });

  it('GIVEN filters WHEN combined THEN both narrow the result', () => {
    const result = queryEntries(entries, { ...entryQuery, name: 'ET', env_dependent: true });
    expect(result.items.map((e) => e.name)).toEqual(['zeta']);
  });

  it('GIVEN a page beyond the matches WHEN requested THEN it is empty but totals count all matches', () => {
    const result = queryEntries(entries, { ...entryQuery, page: 2 });
    expect(result.items).toEqual([]);
    expect(result.totalItems).toBe(3);
  });
});
