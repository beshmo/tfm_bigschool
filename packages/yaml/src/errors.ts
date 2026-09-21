import type { ErrorCode } from '@okvns/shared';

/** Raised for any invalid OKVNS YAML; carries the API error code to surface. */
export class YamlError extends Error {
  constructor(
    readonly code: ErrorCode,
    message: string,
    readonly details: readonly string[] = [],
  ) {
    super(message);
    this.name = 'YamlError';
  }
}
