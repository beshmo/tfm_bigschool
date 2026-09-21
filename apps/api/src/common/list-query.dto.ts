import {
  DEFAULT_PAGE,
  DEFAULT_PAGE_SIZE,
  DEFAULT_SORT_DIRECTION,
  DEFAULT_SORT_FIELD,
  ENTRY_SORT_FIELDS,
  NAMESPACE_SORT_FIELDS,
  PAGE_SIZES,
  SORT_DIRECTIONS,
  isPageSize,
  type EntryListQuery,
  type EntrySortField,
  type NamespaceListQuery,
  type NamespaceSortField,
  type SortDirection,
} from '@okvns/shared';
import { requestValidationError } from './validation';

type RawQuery = Record<string, unknown>;

/** Reads a query parameter that must appear at most once and be a string. */
function single(raw: RawQuery, name: string, details: string[]): string | undefined {
  const value = raw[name];
  if (value === undefined) {
    return undefined;
  }
  if (typeof value !== 'string') {
    details.push(`${name} must be a single value`);
    return undefined;
  }
  return value;
}

function oneOf<T extends string>(
  raw: RawQuery,
  name: string,
  allowed: readonly T[],
  fallback: T,
  details: string[],
): T {
  const value = single(raw, name, details);
  if (value === undefined) {
    return fallback;
  }
  if (!(allowed as readonly string[]).includes(value)) {
    details.push(`${name} must be one of: ${allowed.join(', ')}`);
    return fallback;
  }
  return value as T;
}

function parseCommon(raw: RawQuery, details: string[]) {
  let page = DEFAULT_PAGE;
  const rawPage = single(raw, 'page', details);
  if (rawPage !== undefined) {
    const parsed = Number(rawPage);
    if (/^\d+$/.test(rawPage) && Number.isSafeInteger(parsed) && parsed >= 1) {
      page = parsed;
    } else {
      details.push('page must be an integer greater than or equal to 1');
    }
  }

  let pageSize = DEFAULT_PAGE_SIZE;
  const rawPageSize = single(raw, 'page_size', details);
  if (rawPageSize !== undefined) {
    const parsed = Number(rawPageSize);
    if (isPageSize(parsed) && String(parsed) === rawPageSize) {
      pageSize = parsed;
    } else {
      details.push(`page_size must be one of: ${PAGE_SIZES.join(', ')}`);
    }
  }

  const direction: SortDirection = oneOf(
    raw,
    'direction',
    SORT_DIRECTIONS,
    DEFAULT_SORT_DIRECTION,
    details,
  );
  const name = single(raw, 'name', details);
  return { page, pageSize, direction, name: name === '' ? undefined : name };
}

/** Parses and validates `GET /namespaces` query parameters against the allowlists. */
export function parseNamespaceListQuery(raw: RawQuery): NamespaceListQuery {
  const details: string[] = [];
  const common = parseCommon(raw, details);
  const sort: NamespaceSortField = oneOf(
    raw,
    'sort',
    NAMESPACE_SORT_FIELDS,
    DEFAULT_SORT_FIELD,
    details,
  );
  if (details.length > 0) {
    throw requestValidationError(details);
  }
  return { ...common, sort };
}

/** Parses and validates `GET /namespaces/:name/entries` query parameters against the allowlists. */
export function parseEntryListQuery(raw: RawQuery): EntryListQuery {
  const details: string[] = [];
  const common = parseCommon(raw, details);
  const sort: EntrySortField = oneOf(raw, 'sort', ENTRY_SORT_FIELDS, DEFAULT_SORT_FIELD, details);
  const rawEnv = single(raw, 'env_dependent', details);
  let envDependent: boolean | undefined;
  if (rawEnv !== undefined) {
    if (rawEnv === 'true' || rawEnv === 'false') {
      envDependent = rawEnv === 'true';
    } else {
      details.push('env_dependent must be true or false');
    }
  }
  if (details.length > 0) {
    throw requestValidationError(details);
  }
  return { ...common, sort, envDependent };
}
