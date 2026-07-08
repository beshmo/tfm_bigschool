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
}

/** Serialized representation of a namespace as returned by the API. */
export interface NamespaceDto {
  name: string;
  entries: EntryDto[];
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
}

/** Request body used to create or update an entry. */
export interface EntryInputDto {
  name: string;
  value: string;
}

/** Request body used to import markdown. */
export interface MarkdownImportRequestDto {
  markdown: string;
}

/** Response returned by markdown export endpoints. */
export interface MarkdownExportResponseDto {
  markdown: string;
}

/** Response returned by a markdown import once applied. */
export interface MarkdownImportResponseDto {
  namespaces: NamespaceDto[];
}

/**
 * Allowlisted resource-name format for namespace and entry names.
 *
 * Names are trimmed, non-empty UTF-8 strings limited to a small, safe character
 * set: letters, digits, and the separators `.`, `_`, and `-`. This keeps names
 * usable in URLs, markdown keys, and storage keys without escaping surprises.
 */
export const RESOURCE_NAME_PATTERN = /^[\p{L}\p{N}][\p{L}\p{N}._-]*$/u;

/** Maximum length of a namespace or entry name after trimming. */
export const RESOURCE_NAME_MAX_LENGTH = 128;

/** Maximum length, in UTF-16 code units, of an entry value. */
export const ENTRY_VALUE_MAX_LENGTH = 65_536;

/** Maximum accepted request body size, in bytes, for JSON and markdown payloads. */
export const REQUEST_BODY_MAX_BYTES = 1_048_576;

/** Stable machine-readable error codes surfaced to clients. */
export const ERROR_CODES = {
  VALIDATION: 'VALIDATION_ERROR',
  DUPLICATE_NAMESPACE: 'DUPLICATE_NAMESPACE',
  DUPLICATE_ENTRY: 'DUPLICATE_ENTRY',
  NAMESPACE_NOT_FOUND: 'NAMESPACE_NOT_FOUND',
  ENTRY_NOT_FOUND: 'ENTRY_NOT_FOUND',
  INVALID_MARKDOWN: 'INVALID_MARKDOWN',
  INTERNAL: 'INTERNAL_ERROR',
} as const;

export type ErrorCode = (typeof ERROR_CODES)[keyof typeof ERROR_CODES];

/** Deterministic, locale-independent ordering for namespace and entry names. */
export function compareNames(a: string, b: string): number {
  if (a < b) return -1;
  if (a > b) return 1;
  return 0;
}
