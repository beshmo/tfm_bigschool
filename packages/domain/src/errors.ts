import { ERROR_CODES, type ErrorCode } from '@okvns/shared';

/**
 * Base class for all OKVNS business errors. Presentation layers map the stable
 * `code` to transport-specific responses without leaking implementation detail.
 */
export abstract class DomainError extends Error {
  abstract readonly code: ErrorCode;

  constructor(message: string) {
    super(message);
    this.name = new.target.name;
  }
}

export class InvalidResourceNameError extends DomainError {
  readonly code = ERROR_CODES.VALIDATION;

  constructor(readonly attempted: unknown) {
    super('Resource name must be a trimmed, non-empty, allowlisted UTF-8 string.');
  }
}

export class InvalidEntryValueError extends DomainError {
  readonly code = ERROR_CODES.VALIDATION;

  constructor(readonly entryName: string) {
    super(`Entry value for "${entryName}" must be a UTF-8 string within the allowed size.`);
  }
}

export class DuplicateNamespaceError extends DomainError {
  readonly code = ERROR_CODES.DUPLICATE_NAMESPACE;

  constructor(readonly namespaceName: string) {
    super(`Namespace "${namespaceName}" already exists.`);
  }
}

export class DuplicateEntryError extends DomainError {
  readonly code = ERROR_CODES.DUPLICATE_ENTRY;

  constructor(
    readonly namespaceName: string,
    readonly entryName: string,
  ) {
    super(`Entry "${entryName}" already exists in namespace "${namespaceName}".`);
  }
}

export class NamespaceNotFoundError extends DomainError {
  readonly code = ERROR_CODES.NAMESPACE_NOT_FOUND;

  constructor(readonly namespaceName: string) {
    super(`Namespace "${namespaceName}" was not found.`);
  }
}

export class EntryNotFoundError extends DomainError {
  readonly code = ERROR_CODES.ENTRY_NOT_FOUND;

  constructor(
    readonly namespaceName: string,
    readonly entryName: string,
  ) {
    super(`Entry "${entryName}" was not found in namespace "${namespaceName}".`);
  }
}

export class InvalidYamlError extends DomainError {
  readonly code = ERROR_CODES.INVALID_YAML;

  constructor(
    message: string,
    readonly details: string[] = [],
  ) {
    super(message);
  }
}
