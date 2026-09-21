import type { Entry, Namespace } from '@okvns/domain';
import type { NamespaceSummary, PageResult } from '@okvns/application';
import type {
  EntryDto,
  NamespaceDto,
  NamespaceListItemDto,
  PaginatedResultDto,
} from '@okvns/shared';

/** Repositories own timestamps; the epoch is only a defensive fallback for unstamped objects. */
function iso(date: Date | undefined): string {
  return (date ?? new Date(0)).toISOString();
}

export function toEntryDto(entry: Entry): EntryDto {
  return {
    name: entry.name,
    value: entry.value,
    ...(entry.description === undefined ? {} : { description: entry.description }),
    env_dependent: entry.envDependent,
    created_at: iso(entry.createdAt),
    modified_at: iso(entry.modifiedAt),
  };
}

export function toNamespaceDto(namespace: Namespace): NamespaceDto {
  return {
    name: namespace.name,
    ...(namespace.description === undefined ? {} : { description: namespace.description }),
    entries: namespace.entries.map(toEntryDto),
    created_at: iso(namespace.createdAt),
    modified_at: iso(namespace.modifiedAt),
  };
}

export function toNamespaceListItemDto(summary: NamespaceSummary): NamespaceListItemDto {
  return {
    name: summary.name,
    ...(summary.description === undefined ? {} : { description: summary.description }),
    created_at: iso(summary.createdAt),
    modified_at: iso(summary.modifiedAt),
  };
}

export function toPageDto<T, D>(page: PageResult<T>, map: (item: T) => D): PaginatedResultDto<D> {
  return {
    items: page.items.map(map),
    page: page.page,
    page_size: page.pageSize,
    total_items: page.totalItems,
    total_pages: page.totalPages,
  };
}
