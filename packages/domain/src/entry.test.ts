import { afterEach, describe, expect, it, vi } from 'vitest';
import { Entry } from './entry.js';
import {
  InvalidDescriptionError,
  InvalidEntryValueError,
  InvalidResourceNameError,
} from './errors.js';

const ISO = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/;

describe('Entry', () => {
  afterEach(() => {
    vi.useRealTimers();
  });

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

  it('GIVEN a new entry WHEN created THEN it carries matching ISO timestamps', () => {
    const entry = Entry.create('k', 'v');
    expect(entry.createdAt).toMatch(ISO);
    expect(entry.modifiedAt).toBe(entry.createdAt);
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

  it('GIVEN an entry WHEN withValue is called THEN a new entry keeps the name and creation time but refreshes modification', () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-01-01T00:00:00.000Z'));
    const original = Entry.create('k', 'a');
    vi.setSystemTime(new Date('2026-01-02T00:00:00.000Z'));
    const updated = original.withValue('b');
    expect(updated.name).toBe('k');
    expect(updated.value).toBe('b');
    expect(original.value).toBe('a');
    expect(updated.createdAt).toBe(original.createdAt);
    expect(updated.modifiedAt).toBe('2026-01-02T00:00:00.000Z');
  });

  it('GIVEN stored state WHEN rehydrated THEN it restores value and timestamps', () => {
    const entry = Entry.rehydrate('k', 'v', '2020-01-01T00:00:00.000Z', '2021-01-01T00:00:00.000Z');
    expect(entry.value).toBe('v');
    expect(entry.createdAt).toBe('2020-01-01T00:00:00.000Z');
    expect(entry.modifiedAt).toBe('2021-01-01T00:00:00.000Z');
  });

  it('GIVEN a valid description WHEN created THEN it is trimmed and kept', () => {
    expect(Entry.create('k', 'v', '  the API key  ').description).toBe('the API key');
  });

  it('GIVEN no description WHEN created THEN the description is absent', () => {
    expect(Entry.create('k', 'v').description).toBeUndefined();
  });

  it('GIVEN a whitespace-only description WHEN created THEN it normalizes to absent', () => {
    expect(Entry.create('k', 'v', '   \n ').description).toBeUndefined();
  });

  it('GIVEN a non-string description WHEN created THEN it throws InvalidDescriptionError', () => {
    expect(() => Entry.create('k', 'v', 42)).toThrow(InvalidDescriptionError);
  });

  it('GIVEN a description at the max length WHEN created THEN it is accepted', () => {
    expect(Entry.create('k', 'v', 'x'.repeat(1000)).description).toHaveLength(1000);
  });

  it('GIVEN a description over the max length WHEN created THEN it throws InvalidDescriptionError', () => {
    expect(() => Entry.create('k', 'v', 'x'.repeat(1001))).toThrow(InvalidDescriptionError);
  });

  it('GIVEN stored state with a description WHEN rehydrated THEN the description is restored', () => {
    const entry = Entry.rehydrate(
      'k',
      'v',
      '2020-01-01T00:00:00.000Z',
      '2021-01-01T00:00:00.000Z',
      'docs',
    );
    expect(entry.description).toBe('docs');
  });

  it('GIVEN an entry with a description WHEN withValue omits the description THEN it is preserved', () => {
    const updated = Entry.create('k', 'a', 'docs').withValue('b');
    expect(updated.description).toBe('docs');
    expect(updated.value).toBe('b');
  });

  it('GIVEN an entry with a description WHEN withValue passes a new description THEN it is replaced', () => {
    expect(Entry.create('k', 'a', 'old').withValue('a', 'new').description).toBe('new');
  });

  it('GIVEN an entry with a description WHEN withValue passes a blank description THEN it is cleared', () => {
    expect(Entry.create('k', 'a', 'old').withValue('a', '  ').description).toBeUndefined();
  });

  it('GIVEN an entry WHEN stamped THEN its timestamps are overwritten', () => {
    const entry = Entry.create('k', 'v');
    entry.stamp('2020-01-01T00:00:00.000Z', '2022-01-01T00:00:00.000Z');
    expect(entry.createdAt).toBe('2020-01-01T00:00:00.000Z');
    expect(entry.modifiedAt).toBe('2022-01-01T00:00:00.000Z');
  });

  it('GIVEN an entry WHEN converted to DTO THEN it exposes name, value, and timestamps', () => {
    const entry = Entry.rehydrate('k', 'v', '2020-01-01T00:00:00.000Z', '2021-01-01T00:00:00.000Z');
    expect(entry.toDto()).toEqual({
      name: 'k',
      value: 'v',
      created_at: '2020-01-01T00:00:00.000Z',
      modified_at: '2021-01-01T00:00:00.000Z',
    });
  });

  it('GIVEN an entry with a description WHEN converted to DTO THEN the description is included', () => {
    const entry = Entry.rehydrate(
      'k',
      'v',
      '2020-01-01T00:00:00.000Z',
      '2021-01-01T00:00:00.000Z',
      'docs',
    );
    expect(entry.toDto()).toEqual({
      name: 'k',
      value: 'v',
      description: 'docs',
      created_at: '2020-01-01T00:00:00.000Z',
      modified_at: '2021-01-01T00:00:00.000Z',
    });
  });
});
