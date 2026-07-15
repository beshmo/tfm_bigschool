/**
 * @okvns/shared
 *
 * Stable, framework-independent types and constants shared across the OKVNS
 * platform. This package MUST NOT contain business flows — only transport-facing
 * types, contracts, and constants.
 */

/** Serialized representation of an entry as returned by the API. */
export interface EntryDto {
  name: string;
  value: string;
  /** Optional human-facing documentation. Absent when no description is stored. */
  description?: string;
  /**
   * Whether the entry's value is specific to a deployment environment and needs
   * review after being imported elsewhere. Always present; an entry stored
   * without the flag reads back as `false`.
   */
  env_dependent: boolean;
  /** ISO 8601 timestamp of when the entry was first created. */
  created_at: string;
  /** ISO 8601 timestamp of when the entry was last modified. */
  modified_at: string;
}

/** Serialized representation of a namespace as returned by the API. */
export interface NamespaceDto {
  name: string;
  /** Optional human-facing documentation. Absent when no description is stored. */
  description?: string;
  entries: EntryDto[];
  /** ISO 8601 timestamp of when the namespace was first created. */
  created_at: string;
  /**
   * ISO 8601 timestamp of the last namespace-level change or entry mutation
   * inside the namespace (aggregate freshness).
   */
  modified_at: string;
}

/**
 * A namespace as returned by the paginated list endpoint.
 *
 * Deliberately omits `entries`: a page of namespaces would otherwise carry
 * every entry of every namespace on it, which defeats the point of paging and
 * makes list ordering and filtering far more expensive. Fetch a namespace's
 * entries from the paginated entry list endpoint, or the whole aggregate from
 * the namespace detail endpoint.
 */
export interface NamespaceListItemDto {
  name: string;
  /** Optional human-facing documentation. Absent when no description is stored. */
  description?: string;
  /** ISO 8601 timestamp of when the namespace was first created. */
  created_at: string;
  /** ISO 8601 timestamp of the last change to the namespace or its entries. */
  modified_at: string;
}

/** One page of a list result, with metadata describing the full result set. */
export interface PaginatedResultDto<T> {
  /** The items on the requested page. Shorter than `page_size` on the last page. */
  items: T[];
  /** 1-based index of the returned page. */
  page: number;
  /** The page size the result was built with; one of {@link PAGE_SIZES}. */
  page_size: number;
  /** Total items matching the query across every page, ignoring pagination. */
  total_items: number;
  /** Total pages available for `total_items` at `page_size`; 0 when empty. */
  total_pages: number;
}

/** Safe API error shape. Never contains stack traces or implementation details. */
export interface ApiErrorDto {
  error: {
    code: string;
    message: string;
    /** Optional field-level validation details for boundary errors. */
    details?: string[];
  };
}

/** Request body used to create or rename a namespace. */
export interface NamespaceInputDto {
  name: string;
  /** Optional human-facing documentation. Blank values clear the description. */
  description?: string;
}

/** Request body used to create or update an entry. */
export interface EntryInputDto {
  name: string;
  value: string;
  /** Optional human-facing documentation. Blank values clear the description. */
  description?: string;
  /**
   * Whether the value is environment-specific. Omitting the field on create
   * stores `false`; omitting it on update keeps the stored value.
   */
  env_dependent?: boolean;
}

/** Request body used to import YAML. */
export interface YamlImportRequestDto {
  yaml: string;
}

/** Response returned by YAML export endpoints. */
export interface YamlExportResponseDto {
  yaml: string;
}

/** Response returned by a YAML import once applied. */
export interface YamlImportResponseDto {
  namespaces: NamespaceDto[];
}

/**
 * Allowlisted resource-name format for namespace and entry names.
 *
 * Names are trimmed, non-empty UTF-8 strings limited to a small, safe character
 * set: letters, digits, and the separators `.`, `_`, and `-`. This keeps names
 * usable in URLs, YAML keys, and storage keys without escaping surprises.
 */
export const RESOURCE_NAME_PATTERN = /^[\p{L}\p{N}][\p{L}\p{N}._-]*$/u;

/** Maximum length of a namespace or entry name after trimming. */
export const RESOURCE_NAME_MAX_LENGTH = 128;

/** Maximum length, in UTF-16 code units, of an entry value. */
export const ENTRY_VALUE_MAX_LENGTH = 65_536;

/**
 * Maximum length, in UTF-16 code units, of a namespace or entry description
 * after trimming. Descriptions are short documentation, not payloads.
 */
export const DESCRIPTION_MAX_LENGTH = 1000;

/** Maximum accepted request body size, in bytes, for JSON and YAML payloads. */
export const REQUEST_BODY_MAX_BYTES = 1_048_576;

/** Stable machine-readable error codes surfaced to clients. */
export const ERROR_CODES = {
  VALIDATION: 'VALIDATION_ERROR',
  DUPLICATE_NAMESPACE: 'DUPLICATE_NAMESPACE',
  DUPLICATE_ENTRY: 'DUPLICATE_ENTRY',
  NAMESPACE_NOT_FOUND: 'NAMESPACE_NOT_FOUND',
  ENTRY_NOT_FOUND: 'ENTRY_NOT_FOUND',
  INVALID_YAML: 'INVALID_YAML',
  INTERNAL: 'INTERNAL_ERROR',
} as const;

export type ErrorCode = (typeof ERROR_CODES)[keyof typeof ERROR_CODES];

/**
 * Page sizes a list query may request. Allowlisted rather than range-checked so
 * the API, the admin UI, and any cache keyed on the query all agree on the same
 * small set of pages.
 */
export const PAGE_SIZES = [10, 50, 100] as const;

export type PageSize = (typeof PAGE_SIZES)[number];

/** Page size used when a list query does not request one. */
export const DEFAULT_PAGE_SIZE: PageSize = 10;

/** Sort fields accepted by the namespace list query. */
export const NAMESPACE_SORT_FIELDS = ['name', 'created_at', 'modified_at'] as const;

export type NamespaceSortField = (typeof NAMESPACE_SORT_FIELDS)[number];

/** Sort fields accepted by the entry list query. */
export const ENTRY_SORT_FIELDS = ['name', 'created_at', 'modified_at', 'env_dependent'] as const;

export type EntrySortField = (typeof ENTRY_SORT_FIELDS)[number];

/** Sort directions accepted by any list query. */
export const SORT_DIRECTIONS = ['asc', 'desc'] as const;

export type SortDirection = (typeof SORT_DIRECTIONS)[number];

/**
 * Sort fields and directions are allowlisted (never passed through from the
 * request) so repositories can map them to fixed SQL fragments without any risk
 * of injection, and so in-memory and MySQL adapters cannot drift apart.
 */
export const DEFAULT_SORT_FIELD = 'name';

/** Sort direction used when a list query does not request one. */
export const DEFAULT_SORT_DIRECTION: SortDirection = 'asc';

/** A normalized, validated namespace list query. */
export interface NamespaceListQuery {
  /** 1-based page index. */
  page: number;
  page_size: PageSize;
  sort: NamespaceSortField;
  direction: SortDirection;
  /** Case-insensitive "contains" filter on the namespace name. */
  name?: string;
}

/** A normalized, validated entry list query. */
export interface EntryListQuery {
  /** 1-based page index. */
  page: number;
  page_size: PageSize;
  sort: EntrySortField;
  direction: SortDirection;
  /** Case-insensitive "contains" filter on the entry name. */
  name?: string;
  /** Restricts to entries with this environment-dependence; omit for all. */
  env_dependent?: boolean;
}

/** Whether `value` is a page size the API accepts. */
export function isPageSize(value: number): value is PageSize {
  return (PAGE_SIZES as readonly number[]).includes(value);
}

/**
 * Total pages for `totalItems` at `pageSize`. An empty result set has 0 pages,
 * so a caller can distinguish "nothing matched" from "one empty page".
 */
export function totalPages(totalItems: number, pageSize: PageSize): number {
  return Math.ceil(totalItems / pageSize);
}

/** Deterministic, locale-independent ordering for namespace and entry names. */
export function compareNames(a: string, b: string): number {
  if (a < b) return -1;
  if (a > b) return 1;
  return 0;
}
