/**
 * Transport-independent error surfaced to the UI. Maps a safe API error body
 * (or a network failure) into a stable shape that components can render without
 * knowing about fetch, status codes, or JSON internals.
 */
export class ApiError extends Error {
  constructor(
    readonly code: string,
    message: string,
    readonly details: string[] = [],
    readonly status?: number,
  ) {
    super(message);
    this.name = 'ApiError';
  }
}
