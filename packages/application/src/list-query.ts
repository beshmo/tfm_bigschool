import type { Entry, Namespace } from '@okvns/domain';
import {
  compareNames,
  totalPages,
  type EntryListQuery,
  type NamespaceListQuery,
} from '@okvns/shared';
import type { NamespaceSummary, PageResult } from './ports.js';

function matchesName(name: string, filter: string | undefined): boolean {
  return filter === undefined || filter === '' || name.toLowerCase().includes(filter.toLowerCase());
}

function time(date: Date | undefined): number {
  return date?.getTime() ?? 0;
}

/** Ordering with the API's tie-break: equal primary values fall back to ascending name. */
function order<T extends { name: string }>(
  rows: T[],
  primary: (row: T) => number | string,
  direction: 'asc' | 'desc',
): T[] {
  const sign = direction === 'asc' ? 1 : -1;
  return rows.sort((a, b) => {
    const left = primary(a);
    const right = primary(b);
    const byPrimary =
      typeof left === 'string' && typeof right === 'string'
        ? compareNames(left, right)
        : Number(left) - Number(right);
    return byPrimary === 0 ? compareNames(a.name, b.name) : sign * byPrimary;
  });
}

function paginate<T>(rows: T[], page: number, pageSize: number): PageResult<T> {
  const start = (page - 1) * pageSize;
  return {
    items: rows.slice(start, start + pageSize),
    page,
    pageSize,
    totalItems: rows.length,
    totalPages: totalPages(rows.length, pageSize),
  };
}

export function toSummary(namespace: Namespace): NamespaceSummary {
  const summary: NamespaceSummary = {
    name: namespace.name,
    createdAt: namespace.createdAt,
    modifiedAt: namespace.modifiedAt,
  };
  if (namespace.description !== undefined) {
    summary.description = namespace.description;
  }
  return summary;
}

/** Filters, orders and pages namespaces in memory (used by non-SQL repositories). */
export function queryNamespaces(
  namespaces: readonly Namespace[],
  query: NamespaceListQuery,
): PageResult<NamespaceSummary> {
  const rows = namespaces.filter((namespace) => matchesName(namespace.name, query.name));
  const primary = {
    name: (namespace: Namespace) => namespace.name,
    created_at: (namespace: Namespace) => time(namespace.createdAt),
    modified_at: (namespace: Namespace) => time(namespace.modifiedAt),
  }[query.sort];
  return paginate(order(rows, primary, query.direction).map(toSummary), query.page, query.pageSize);
}

/** Filters, orders and pages entries in memory (used by non-SQL repositories). */
export function queryEntries(entries: readonly Entry[], query: EntryListQuery): PageResult<Entry> {
  const rows = entries.filter(
    (entry) =>
      matchesName(entry.name, query.name) &&
      (query.envDependent === undefined || entry.envDependent === query.envDependent),
  );
  const primary = {
    name: (entry: Entry) => entry.name,
    created_at: (entry: Entry) => time(entry.createdAt),
    modified_at: (entry: Entry) => time(entry.modifiedAt),
    env_dependent: (entry: Entry) => (entry.envDependent ? 1 : 0),
  }[query.sort];
  return paginate(order(rows, primary, query.direction), query.page, query.pageSize);
}
