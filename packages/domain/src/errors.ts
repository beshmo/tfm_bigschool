import { ERROR_CODES, type ErrorCode } from '@okvns/shared';

/** Base class for typed business errors that presentation layers can map safely. */
export class DomainError extends Error {
  constructor(
    readonly code: ErrorCode,
    message: string,
    readonly details: readonly string[] = [],
  ) {
    super(message);
    this.name = new.target.name;
  }
}

export class InvalidResourceNameError extends DomainError {
  constructor(message: string) {
    super(ERROR_CODES.VALIDATION_ERROR, message);
  }
}

export class InvalidDescriptionError extends DomainError {
  constructor(message: string) {
    super(ERROR_CODES.VALIDATION_ERROR, message);
  }
}

export class InvalidEntryValueError extends DomainError {
  constructor(message: string) {
    super(ERROR_CODES.VALIDATION_ERROR, message);
  }
}

export class InvalidEnvDependentError extends DomainError {
  constructor() {
    super(ERROR_CODES.VALIDATION_ERROR, 'env_dependent must be a boolean.');
  }
}

export class EmptyNamespaceUpdateError extends DomainError {
  constructor() {
    super(
      ERROR_CODES.VALIDATION_ERROR,
      'A namespace update must contain a name, a description, or both.',
    );
  }
}

export class DuplicateNamespaceError extends DomainError {
  constructor(readonly namespaceName: string) {
    super(ERROR_CODES.DUPLICATE_NAMESPACE, `Namespace "${namespaceName}" already exists.`);
  }
}

export class DuplicateEntryError extends DomainError {
  constructor(readonly entryName: string) {
    super(ERROR_CODES.DUPLICATE_ENTRY, `Entry "${entryName}" already exists in the namespace.`);
  }
}

export class NamespaceNotFoundError extends DomainError {
  constructor(readonly namespaceName: string) {
    super(ERROR_CODES.NAMESPACE_NOT_FOUND, `Namespace "${namespaceName}" was not found.`);
  }
}

export class EntryNotFoundError extends DomainError {
  constructor(readonly entryName: string) {
    super(ERROR_CODES.ENTRY_NOT_FOUND, `Entry "${entryName}" was not found in the namespace.`);
  }
}

export class InvalidYamlError extends DomainError {
  constructor(message: string, details: readonly string[] = []) {
    super(ERROR_CODES.INVALID_YAML, message, details);
  }
}
