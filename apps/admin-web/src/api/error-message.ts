import { ApiError } from './api-error';

/** Turns any thrown value into a safe, user-facing message string. */
export function messageOf(error: unknown): string {
  if (error instanceof ApiError) {
    return error.details.length > 0
      ? `${error.message} (${error.details.join(', ')})`
      : error.message;
  }
  return 'Unexpected error. Please try again.';
}
