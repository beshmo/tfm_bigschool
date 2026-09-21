/**
 * Framework-independent DTO types, constants and helpers shared by every OKVNS
 * package and app. No business flows live here.
 */

/** Names must start with a letter or digit, then allow letters, digits, `.`, `_` and `-`. */
export const RESOURCE_NAME_PATTERN = /^[\p{L}\p{N}][\p{L}\p{N}._-]*$/u;
export const RESOURCE_NAME_MAX_LENGTH = 128;
export const DESCRIPTION_MAX_LENGTH = 1000;
export const ENTRY_VALUE_MAX_LENGTH = 65_536;
/** Maximum accepted request body (including YAML imports): 1 MiB. */
export const REQUEST_BODY_MAX_BYTES = 1_048_576;

export const ERROR_CODES = {
  VALIDATION_ERROR: 'VALIDATION_ERROR',
  INVALID_YAML: 'INVALID_YAML',
  NAMESPACE_NOT_FOUND: 'NAMESPACE_NOT_FOUND',
  ENTRY_NOT_FOUND: 'ENTRY_NOT_FOUND',
  DUPLICATE_NAMESPACE: 'DUPLICATE_NAMESPACE',
  DUPLICATE_ENTRY: 'DUPLICATE_ENTRY',
  INTERNAL_ERROR: 'INTERNAL_ERROR',
} as const;

export type ErrorCode = (typeof ERROR_CODES)[keyof typeof ERROR_CODES];

export const PAGE_SIZES = [10, 50, 100] as const;
export type PageSize = (typeof PAGE_SIZES)[number];
export const DEFAULT_PAGE = 1;
export const DEFAULT_PAGE_SIZE: PageSize = 10;

export const NAMESPACE_SORT_FIELDS = ['name', 'created_at', 'modified_at'] as const;
export type NamespaceSortField = (typeof NAMESPACE_SORT_FIELDS)[number];
export const ENTRY_SORT_FIELDS = ['name', 'created_at', 'modified_at', 'env_dependent'] as const;
export type EntrySortField = (typeof ENTRY_SORT_FIELDS)[number];
export const SORT_DIRECTIONS = ['asc', 'desc'] as const;
export type SortDirection = (typeof SORT_DIRECTIONS)[number];
export const DEFAULT_SORT_FIELD = 'name';
export const DEFAULT_SORT_DIRECTION: SortDirection = 'asc';

export interface EntryDto {
  name: string;
  value: string;
  description?: string;
  env_dependent: boolean;
  created_at: string;
  modified_at: string;
}

export interface NamespaceListItemDto {
  name: string;
  description?: string;
  created_at: string;
  modified_at: string;
}

export interface NamespaceDto extends NamespaceListItemDto {
  entries: EntryDto[];
}

export interface PaginatedResultDto<T> {
  items: T[];
  page: number;
  page_size: number;
  total_items: number;
  total_pages: number;
}

export interface ApiErrorDto {
  error: {
    code: ErrorCode;
    message: string;
    details?: string[];
  };
}

export interface NamespaceInputDto {
  name: string;
  description?: string;
}

export interface NamespaceUpdateDto {
  name?: string;
  description?: string;
}

export interface EntryInputDto {
  name: string;
  value: string;
  description?: string;
  env_dependent?: boolean;
}

export interface EntryUpdateDto {
  name?: string;
  value?: string;
  description?: string;
  env_dependent?: boolean;
}

export interface YamlImportRequestDto {
  yaml: string;
}

export interface YamlImportResponseDto {
  namespaces: NamespaceDto[];
}

export interface YamlExportResponseDto {
  yaml: string;
}

export interface NamespaceListQuery {
  page: number;
  pageSize: PageSize;
  sort: NamespaceSortField;
  direction: SortDirection;
  /** Case-insensitive, literal "contains" filter on the name. */
  name?: string;
}

export interface EntryListQuery {
  page: number;
  pageSize: PageSize;
  sort: EntrySortField;
  direction: SortDirection;
  name?: string;
  envDependent?: boolean;
}

export function isPageSize(value: unknown): value is PageSize {
  return PAGE_SIZES.some((size) => size === value);
}

/** Total pages for a result set; `0` when nothing matched. */
export function totalPages(totalItems: number, pageSize: number): number {
  return totalItems === 0 ? 0 : Math.ceil(totalItems / pageSize);
}

/** Locale-independent, deterministic name comparison (never `localeCompare`). */
export function compareNames(a: string, b: string): number {
  if (a < b) return -1;
  if (a > b) return 1;
  return 0;
}
