import type { Entry, Namespace } from '@okvns/domain';
import { compareNames, type EntryListQuery, type NamespaceListQuery } from '@okvns/shared';
import type { NamespaceSummary, PageResult } from './ports.js';

/**
 * In-memory list-query semantics, shared by the in-memory repository adapter and
 * the application-layer test double so the two cannot drift apart. The MySQL
 * adapter implements the same semantics in SQL; these functions are the
 * reference the adapters are tested against.
 *
 * Name filters match case-insensitively on a substring, ties on the primary sort
 * field break on ascending name, and paging is offset-based from a 1-based page.
 */

/** Case-insensitive substring match, mirroring the SQL adapter's LIKE filter. */
function matchesName(name: string, filter: string | undefined): boolean {
  if (filter === undefined) {
    return true;
  }
  return name.toLowerCase().includes(filter.toLowerCase());
}

/**
 * Orders by `compareNames` rather than `localeCompare` so results are stable
 * regardless of the host's locale, matching the rest of the platform.
 */
function compareBy(
  direction: 'asc' | 'desc',
  primary: number,
  aName: string,
  bName: string,
): number {
  const signed = direction === 'asc' ? primary : -primary;
  // Ties always break on ascending name, in both directions, so a page boundary
  // never splits rows that compare equal on the primary field.
  return signed !== 0 ? signed : compareNames(aName, bName);
}

/** Applies a query's page and page size to already-filtered, ordered rows. */
function pageOf<T>(rows: T[], page: number, pageSize: number): PageResult<T> {
  const offset = (page - 1) * pageSize;
  return { items: rows.slice(offset, offset + pageSize), totalItems: rows.length };
}

/** Applies a namespace list query to a full set of namespaces. */
export function queryNamespaces(
  namespaces: Namespace[],
  query: NamespaceListQuery,
): PageResult<NamespaceSummary> {
  const matched = namespaces.filter((namespace) => matchesName(namespace.name, query.name));
  const ordered = [...matched].sort((a, b) => {
    const primary =
      query.sort === 'name'
        ? compareNames(a.name, b.name)
        : compareNames(
            query.sort === 'created_at' ? a.createdAt : a.modifiedAt,
            query.sort === 'created_at' ? b.createdAt : b.modifiedAt,
          );
    return compareBy(query.direction, primary, a.name, b.name);
  });
  const { items, totalItems } = pageOf(ordered, query.page, query.page_size);
  return {
    items: items.map((namespace) => ({
      name: namespace.name,
      description: namespace.description,
      createdAt: namespace.createdAt,
      modifiedAt: namespace.modifiedAt,
    })),
    totalItems,
  };
}

/** Applies an entry list query to a namespace's full set of entries. */
export function queryEntries(entries: Entry[], query: EntryListQuery): PageResult<Entry> {
  const matched = entries.filter(
    (entry) =>
      matchesName(entry.name, query.name) &&
      (query.env_dependent === undefined || entry.envDependent === query.env_dependent),
  );
  const ordered = [...matched].sort((a, b) => {
    const primary = comparePrimary(a, b, query.sort);
    return compareBy(query.direction, primary, a.name, b.name);
  });
  return pageOf(ordered, query.page, query.page_size);
}

function comparePrimary(a: Entry, b: Entry, sort: EntryListQuery['sort']): number {
  switch (sort) {
    case 'name':
      return compareNames(a.name, b.name);
    case 'created_at':
      return compareNames(a.createdAt, b.createdAt);
    case 'modified_at':
      return compareNames(a.modifiedAt, b.modifiedAt);
    case 'env_dependent':
      // Ascending puts non-environment-dependent entries first, matching how
      // SQL orders the underlying 0/1 column.
      return Number(a.envDependent) - Number(b.envDependent);
  }
}
