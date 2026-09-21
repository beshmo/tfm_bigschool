import { describe, expect, it } from 'vitest';
import {
  DomainError,
  DuplicateEntryError,
  DuplicateNamespaceError,
  EmptyNamespaceUpdateError,
  EntryNotFoundError,
  InvalidDescriptionError,
  InvalidEntryValueError,
  InvalidEnvDependentError,
  InvalidResourceNameError,
  InvalidYamlError,
  NamespaceNotFoundError,
} from './errors.js';

describe('domain errors', () => {
  it.each([
    [new InvalidResourceNameError('m'), 'VALIDATION_ERROR', 'm', 'InvalidResourceNameError'],
    [new InvalidDescriptionError('m'), 'VALIDATION_ERROR', 'm', 'InvalidDescriptionError'],
    [new InvalidEntryValueError('m'), 'VALIDATION_ERROR', 'm', 'InvalidEntryValueError'],
    [
      new InvalidEnvDependentError(),
      'VALIDATION_ERROR',
      'env_dependent must be a boolean.',
      'InvalidEnvDependentError',
    ],
    [
      new EmptyNamespaceUpdateError(),
      'VALIDATION_ERROR',
      'A namespace update must contain a name, a description, or both.',
      'EmptyNamespaceUpdateError',
    ],
    [
      new DuplicateNamespaceError('n'),
      'DUPLICATE_NAMESPACE',
      'Namespace "n" already exists.',
      'DuplicateNamespaceError',
    ],
    [
      new DuplicateEntryError('e'),
      'DUPLICATE_ENTRY',
      'Entry "e" already exists in the namespace.',
      'DuplicateEntryError',
    ],
    [
      new NamespaceNotFoundError('n'),
      'NAMESPACE_NOT_FOUND',
      'Namespace "n" was not found.',
      'NamespaceNotFoundError',
    ],
    [
      new EntryNotFoundError('e'),
      'ENTRY_NOT_FOUND',
      'Entry "e" was not found in the namespace.',
      'EntryNotFoundError',
    ],
    [new InvalidYamlError('bad'), 'INVALID_YAML', 'bad', 'InvalidYamlError'],
  ])(
    'GIVEN %s WHEN inspected THEN it carries code, message and name',
    (error, code, message, name) => {
      expect(error).toBeInstanceOf(DomainError);
      expect(error).toBeInstanceOf(Error);
      expect(error.code).toBe(code);
      expect(error.message).toBe(message);
      expect(error.name).toBe(name);
      expect(error.details).toEqual([]);
    },
  );

  it('GIVEN details WHEN an invalid-YAML error is built THEN they are kept', () => {
    expect(new InvalidYamlError('bad', ['line 1']).details).toEqual(['line 1']);
  });

  it('GIVEN lookups WHEN not-found and duplicate errors are built THEN the names are exposed', () => {
    expect(new NamespaceNotFoundError('n').namespaceName).toBe('n');
    expect(new DuplicateNamespaceError('n').namespaceName).toBe('n');
    expect(new EntryNotFoundError('e').entryName).toBe('e');
    expect(new DuplicateEntryError('e').entryName).toBe('e');
  });
});
