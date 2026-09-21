import type { ApiErrorDto, ErrorCode } from '@okvns/shared';

/** Single source of truth for the HTTP status of every error code. */
export const STATUS_BY_CODE: Record<ErrorCode, number> = {
  VALIDATION_ERROR: 400,
  INVALID_YAML: 400,
  NAMESPACE_NOT_FOUND: 404,
  ENTRY_NOT_FOUND: 404,
  DUPLICATE_NAMESPACE: 409,
  DUPLICATE_ENTRY: 409,
  INTERNAL_ERROR: 500,
};

export const UNEXPECTED_ERROR_MESSAGE = 'An unexpected error occurred.';
export const VALIDATION_FAILED_MESSAGE = 'Request validation failed.';

/** Builds the safe error body; `details` is omitted unless it has items. */
export function apiError(
  code: ErrorCode,
  message: string,
  details: readonly string[] = [],
): ApiErrorDto {
  return {
    error: details.length > 0 ? { code, message, details: [...details] } : { code, message },
  };
}
