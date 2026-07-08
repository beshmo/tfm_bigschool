import { describe, expect, it } from 'vitest';
import { Entry } from './entry.js';
import { InvalidEntryValueError, InvalidResourceNameError } from './errors.js';

describe('Entry', () => {
  it('GIVEN a valid name and value WHEN created THEN it normalizes the name and keeps the value', () => {
    const entry = Entry.create('  api-key  ', 'secret-value');
    expect(entry.name).toBe('api-key');
    expect(entry.value).toBe('secret-value');
  });

  it('GIVEN an empty string value WHEN created THEN it is accepted', () => {
    expect(Entry.create('flag', '').value).toBe('');
  });

  it('GIVEN a UTF-8 value WHEN created THEN it is preserved', () => {
    expect(Entry.create('greeting', 'こんにちは 🌸').value).toBe('こんにちは 🌸');
  });

  it('GIVEN an invalid name WHEN created THEN it throws InvalidResourceNameError', () => {
    expect(() => Entry.create('', 'v')).toThrow(InvalidResourceNameError);
  });

  it('GIVEN a non-string value WHEN created THEN it throws InvalidEntryValueError', () => {
    expect(() => Entry.create('k', 123 as unknown as string)).toThrow(InvalidEntryValueError);
  });

  it('GIVEN a value over the max length WHEN created THEN it throws InvalidEntryValueError', () => {
    expect(() => Entry.create('k', 'x'.repeat(65_537))).toThrow(InvalidEntryValueError);
  });

  it('GIVEN an entry WHEN withValue is called THEN a new entry with the same name is returned', () => {
    const original = Entry.create('k', 'a');
    const updated = original.withValue('b');
    expect(updated.name).toBe('k');
    expect(updated.value).toBe('b');
    expect(original.value).toBe('a');
  });

  it('GIVEN an entry WHEN converted to DTO THEN it exposes name and value', () => {
    expect(Entry.create('k', 'v').toDto()).toEqual({ name: 'k', value: 'v' });
  });
});
