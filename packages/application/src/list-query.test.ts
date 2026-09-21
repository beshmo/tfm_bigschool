import { describe, expect, it } from 'vitest';
import { queryEntries, queryNamespaces, toSummary } from './list-query.js';
import { at, entry, entryQuery, namespace, namespaceQuery } from './testing/helpers.js';

const namespaces = [
  namespace('charlie', [], { createdAt: at(1), modifiedAt: at(9) }),
  namespace('alpha', [], { createdAt: at(1), modifiedAt: at(5), description: 'first' }),
  namespace('bravo', [], { createdAt: at(3), modifiedAt: at(5) }),
];
const names = (result: { items: { name: string }[] }) => result.items.map((item) => item.name);

describe('queryNamespaces', () => {
  it('GIVEN the default query WHEN listed THEN namespaces are ordered by name with page metadata', () => {
    const result = queryNamespaces(namespaces, namespaceQuery());

    expect(names(result)).toEqual(['alpha', 'bravo', 'charlie']);
    expect(result).toMatchObject({ page: 1, pageSize: 10, totalItems: 3, totalPages: 1 });
  });

  it('GIVEN name descending WHEN listed THEN the order is reversed', () => {
    expect(names(queryNamespaces(namespaces, namespaceQuery({ direction: 'desc' })))).toEqual([
      'charlie',
      'bravo',
      'alpha',
    ]);
  });

  it('GIVEN created_at ascending WHEN rows tie THEN ties break on ascending name', () => {
    expect(names(queryNamespaces(namespaces, namespaceQuery({ sort: 'created_at' })))).toEqual([
      'alpha',
      'charlie',
      'bravo',
    ]);
  });

  it('GIVEN created_at descending WHEN rows tie THEN ties still break on ascending name', () => {
    expect(
      names(queryNamespaces(namespaces, namespaceQuery({ sort: 'created_at', direction: 'desc' }))),
    ).toEqual(['bravo', 'alpha', 'charlie']);
  });

  it('GIVEN modified_at ordering WHEN listed THEN the modification time is used', () => {
    expect(names(queryNamespaces(namespaces, namespaceQuery({ sort: 'modified_at' })))).toEqual([
      'alpha',
      'bravo',
      'charlie',
    ]);
  });

  it('GIVEN namespaces without timestamps WHEN ordered by time THEN they sort as time zero', () => {
    const unstamped = [namespace('b'), namespace('a'), namespace('c', [], { createdAt: at(1) })];

    expect(names(queryNamespaces(unstamped, namespaceQuery({ sort: 'created_at' })))).toEqual([
      'a',
      'b',
      'c',
    ]);
  });

  it('GIVEN a filter WHEN listed THEN names are matched case-insensitively as substrings', () => {
    expect(names(queryNamespaces(namespaces, namespaceQuery({ name: 'AL' })))).toEqual(['alpha']);
    expect(queryNamespaces(namespaces, namespaceQuery({ name: 'a' })).totalItems).toBe(3);
  });

  it('GIVEN wildcard characters in the filter WHEN listed THEN they are matched literally', () => {
    expect(queryNamespaces(namespaces, namespaceQuery({ name: '%' })).totalItems).toBe(0);
    expect(queryNamespaces(namespaces, namespaceQuery({ name: '_' })).totalItems).toBe(0);
    expect(
      queryNamespaces([namespace('a_b'), namespace('axb')], namespaceQuery({ name: 'a_b' }))
        .totalItems,
    ).toBe(1);
  });

  it('GIVEN an empty filter WHEN listed THEN nothing is filtered out', () => {
    expect(queryNamespaces(namespaces, namespaceQuery({ name: '' })).totalItems).toBe(3);
  });

  it('GIVEN a page size smaller than the result WHEN paging THEN metadata describes the full set', () => {
    const many = Array.from({ length: 25 }, (_, index) =>
      namespace(`n${String(index).padStart(2, '0')}`),
    );

    const second = queryNamespaces(many, namespaceQuery({ page: 2 }));
    const third = queryNamespaces(many, namespaceQuery({ page: 3 }));

    expect(second.items).toHaveLength(10);
    expect(names(second)[0]).toBe('n10');
    expect(third.items).toHaveLength(5);
    expect(third).toMatchObject({ totalItems: 25, totalPages: 3 });
  });

  it('GIVEN a page past the end WHEN listed THEN items are empty and totals are true', () => {
    const result = queryNamespaces(namespaces, namespaceQuery({ page: 5 }));

    expect(result.items).toEqual([]);
    expect(result).toMatchObject({ page: 5, totalItems: 3, totalPages: 1 });
  });

  it('GIVEN nothing matches WHEN listed THEN there are zero pages', () => {
    expect(queryNamespaces(namespaces, namespaceQuery({ name: 'zzz' }))).toMatchObject({
      items: [],
      totalItems: 0,
      totalPages: 0,
    });
  });

  it('GIVEN namespaces WHEN summarized THEN entries are not carried and description is optional', () => {
    const withDescription = toSummary(namespaces[1]!);
    const without = toSummary(namespaces[0]!);

    expect(withDescription).toEqual({
      name: 'alpha',
      description: 'first',
      createdAt: at(1),
      modifiedAt: at(5),
    });
    expect(without).toEqual({ name: 'charlie', createdAt: at(1), modifiedAt: at(9) });
    expect('entries' in withDescription).toBe(false);
  });
});

describe('queryEntries', () => {
  const entries = [
    entry('db-host', 'h', { envDependent: true, createdAt: at(2), modifiedAt: at(8) }),
    entry('db-port', 'p', { createdAt: at(1), modifiedAt: at(8) }),
    entry('retries', 'r', { envDependent: true, createdAt: at(1), modifiedAt: at(3) }),
  ];

  it('GIVEN the default query WHEN listed THEN entries are ordered by name', () => {
    expect(names(queryEntries(entries, entryQuery()))).toEqual(['db-host', 'db-port', 'retries']);
  });

  it('GIVEN an env_dependent filter WHEN listed THEN only matching entries remain', () => {
    expect(names(queryEntries(entries, entryQuery({ envDependent: true })))).toEqual([
      'db-host',
      'retries',
    ]);
    expect(names(queryEntries(entries, entryQuery({ envDependent: false })))).toEqual(['db-port']);
  });

  it('GIVEN a name filter and an env filter WHEN listed THEN both apply', () => {
    const result = queryEntries(entries, entryQuery({ name: 'DB', envDependent: true }));

    expect(names(result)).toEqual(['db-host']);
    expect(result.totalItems).toBe(1);
  });

  it('GIVEN env_dependent ordering WHEN listed THEN independent entries come first ascending', () => {
    expect(names(queryEntries(entries, entryQuery({ sort: 'env_dependent' })))).toEqual([
      'db-port',
      'db-host',
      'retries',
    ]);
    expect(
      names(queryEntries(entries, entryQuery({ sort: 'env_dependent', direction: 'desc' }))),
    ).toEqual(['db-host', 'retries', 'db-port']);
  });

  it('GIVEN timestamp orderings WHEN listed THEN they use the entry timestamps', () => {
    expect(names(queryEntries(entries, entryQuery({ sort: 'created_at' })))).toEqual([
      'db-port',
      'retries',
      'db-host',
    ]);
    expect(
      names(queryEntries(entries, entryQuery({ sort: 'modified_at', direction: 'desc' }))),
    ).toEqual(['db-host', 'db-port', 'retries']);
  });

  it('GIVEN a small page size WHEN paging THEN the metadata covers the full filtered set', () => {
    const many = Array.from({ length: 12 }, (_, index) =>
      entry(`k${String(index).padStart(2, '0')}`),
    );

    expect(queryEntries(many, entryQuery({ page: 2 }))).toMatchObject({
      totalItems: 12,
      totalPages: 2,
      page: 2,
    });
    expect(queryEntries(many, entryQuery({ page: 2 })).items).toHaveLength(2);
  });
});
