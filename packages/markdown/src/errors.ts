import { type ErrorCode } from '@okvns/shared';

/**
 * Raised by the markdown parser for any schema, shape, size, or duplication
 * problem. The `code` mirrors the OKVNS error codes so presentation layers can
 * map it to a safe HTTP response.
 */
export class MarkdownError extends Error {
  constructor(
    readonly code: ErrorCode,
    message: string,
    readonly details: string[] = [],
  ) {
    super(message);
    this.name = 'MarkdownError';
  }
}
