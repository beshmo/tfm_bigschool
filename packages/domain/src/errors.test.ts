import { describe, expect, it } from 'vitest';
import { ERROR_CODES } from '@okvns/shared';
import {
  DomainError,
  DuplicateEntryError,
  DuplicateNamespaceError,
  EntryNotFoundError,
  InvalidEntryValueError,
  InvalidMarkdownError,
  InvalidResourceNameError,
  NamespaceNotFoundError,
} from './errors.js';

describe('domain errors', () => {
  it('GIVEN any domain error WHEN thrown THEN it is a DomainError with its class name', () => {
    const error = new InvalidResourceNameError('bad');
    expect(error).toBeInstanceOf(DomainError);
    expect(error).toBeInstanceOf(Error);
    expect(error.name).toBe('InvalidResourceNameError');
    expect(error.attempted).toBe('bad');
  });

  it('exposes stable codes for each business error', () => {
    expect(new InvalidResourceNameError('x').code).toBe(ERROR_CODES.VALIDATION);
    expect(new InvalidEntryValueError('k').code).toBe(ERROR_CODES.VALIDATION);
    expect(new DuplicateNamespaceError('ns').code).toBe(ERROR_CODES.DUPLICATE_NAMESPACE);
    expect(new DuplicateEntryError('ns', 'e').code).toBe(ERROR_CODES.DUPLICATE_ENTRY);
    expect(new NamespaceNotFoundError('ns').code).toBe(ERROR_CODES.NAMESPACE_NOT_FOUND);
    expect(new EntryNotFoundError('ns', 'e').code).toBe(ERROR_CODES.ENTRY_NOT_FOUND);
    expect(new InvalidMarkdownError('bad').code).toBe(ERROR_CODES.INVALID_MARKDOWN);
  });

  it('carries contextual fields for mapping', () => {
    expect(new InvalidEntryValueError('k').entryName).toBe('k');
    expect(new DuplicateNamespaceError('ns').namespaceName).toBe('ns');
    const dup = new DuplicateEntryError('ns', 'e');
    expect([dup.namespaceName, dup.entryName]).toEqual(['ns', 'e']);
    expect(new NamespaceNotFoundError('ns').namespaceName).toBe('ns');
    const missing = new EntryNotFoundError('ns', 'e');
    expect([missing.namespaceName, missing.entryName]).toEqual(['ns', 'e']);
  });

  it('GIVEN an InvalidMarkdownError WHEN created THEN details default to empty and are carried', () => {
    expect(new InvalidMarkdownError('bad').details).toEqual([]);
    expect(new InvalidMarkdownError('bad', ['line 1']).details).toEqual(['line 1']);
  });
});
