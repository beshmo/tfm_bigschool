import { ApiError } from './api-error';

export interface DisplayError {
  title: string;
  message: string;
  details: string[];
}

/** Turns any thrown value into text that is safe to show; never exposes stacks or transport details. */
export function toDisplayError(error: unknown): DisplayError {
  if (error instanceof ApiError) {
    return {
      title: error.status === 0 ? 'Connection problem' : 'Request failed',
      message: error.message,
      details: error.details,
    };
  }
  return { title: 'Something went wrong', message: 'An unexpected error occurred.', details: [] };
}
