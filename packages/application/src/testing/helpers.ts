import { Entry, Namespace } from '@okvns/domain';
import type { EntryListQuery, NamespaceListQuery } from '@okvns/shared';

/** A clock that advances one second per call, starting at 2026-01-01T00:00:00Z. */
export function steppingClock(): () => Date {
  let tick = 0;
  return () => new Date(Date.UTC(2026, 0, 1, 0, 0, tick++));
}

export function at(second: number): Date {
  return new Date(Date.UTC(2026, 0, 1, 0, 0, second));
}

export function entry(name: string, value = 'v', extra: Record<string, unknown> = {}): Entry {
  return Entry.create({ name, value, ...extra });
}

export function namespace(
  name: string,
  entries: Entry[] = [],
  extra: Record<string, unknown> = {},
): Namespace {
  return Namespace.create({ name, entries, ...extra });
}

export const namespaceQuery = (
  overrides: Partial<NamespaceListQuery> = {},
): NamespaceListQuery => ({
  page: 1,
  pageSize: 10,
  sort: 'name',
  direction: 'asc',
  ...overrides,
});

export const entryQuery = (overrides: Partial<EntryListQuery> = {}): EntryListQuery => ({
  page: 1,
  pageSize: 10,
  sort: 'name',
  direction: 'asc',
  ...overrides,
});
