import { ERROR_CODES, type ApiErrorDto, type ErrorCode } from '@okvns/shared';

/** HTTP status for each stable OKVNS error code. */
export const STATUS_BY_CODE: Record<ErrorCode, number> = {
  [ERROR_CODES.VALIDATION]: 400,
  [ERROR_CODES.INVALID_YAML]: 400,
  [ERROR_CODES.DUPLICATE_NAMESPACE]: 409,
  [ERROR_CODES.DUPLICATE_ENTRY]: 409,
  [ERROR_CODES.NAMESPACE_NOT_FOUND]: 404,
  [ERROR_CODES.ENTRY_NOT_FOUND]: 404,
  [ERROR_CODES.INTERNAL]: 500,
};

/** Builds a safe API error body that never contains stack traces. */
export function buildApiError(code: ErrorCode, message: string, details?: string[]): ApiErrorDto {
  const error: ApiErrorDto['error'] = { code, message };
  if (details && details.length > 0) {
    error.details = details;
  }
  return { error };
}

/** Maps an HTTP status to a client-error or internal error code. */
export function codeForStatus(status: number): ErrorCode {
  return status >= 500 ? ERROR_CODES.INTERNAL : ERROR_CODES.VALIDATION;
}
