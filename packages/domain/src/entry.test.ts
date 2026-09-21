import { describe, expect, it } from 'vitest';
import { Entry } from './entry.js';
import {
  InvalidDescriptionError,
  InvalidEntryValueError,
  InvalidEnvDependentError,
  InvalidResourceNameError,
} from './errors.js';

const created = new Date('2026-01-01T00:00:00.000Z');
const modified = new Date('2026-01-02T00:00:00.000Z');

describe('Entry.create', () => {
  it('GIVEN a valid name and value WHEN created THEN defaults are applied', () => {
    const entry = Entry.create({ name: ' key ', value: 'v' });

    expect(entry.name).toBe('key');
    expect(entry.value).toBe('v');
    expect(entry.description).toBeUndefined();
    expect(entry.envDependent).toBe(false);
    expect(entry.createdAt).toBeUndefined();
    expect(entry.modifiedAt).toBeUndefined();
  });

  it('GIVEN every optional field WHEN created THEN they are normalized and kept', () => {
    const entry = Entry.create({
      name: 'key',
      value: '',
      description: '  doc  ',
      envDependent: true,
      createdAt: created,
      modifiedAt: modified,
    });

    expect(entry.value).toBe('');
    expect(entry.description).toBe('doc');
    expect(entry.envDependent).toBe(true);
    expect(entry.createdAt).toBe(created);
    expect(entry.modifiedAt).toBe(modified);
  });

  it('GIVEN a blank description WHEN created THEN the entry has none', () => {
    expect(Entry.create({ name: 'k', value: 'v', description: '  ' }).description).toBeUndefined();
  });

  it('GIVEN an invalid name WHEN created THEN it is rejected', () => {
    expect(() => Entry.create({ name: '', value: 'v' })).toThrow(InvalidResourceNameError);
    expect(() => Entry.create({ name: '', value: 'v' })).toThrow('Entry name must not be empty.');
  });

  it('GIVEN a non-string value WHEN created THEN it is rejected', () => {
    expect(() => Entry.create({ name: 'k', value: 1 })).toThrow(InvalidEntryValueError);
  });

  it('GIVEN an oversized value WHEN created THEN it is rejected', () => {
    expect(() => Entry.create({ name: 'k', value: 'x'.repeat(65_537) })).toThrow(
      'Entry value must be at most 65536 characters.',
    );
    expect(Entry.create({ name: 'k', value: 'x'.repeat(65_536) }).value).toHaveLength(65_536);
  });

  it('GIVEN an oversized description WHEN created THEN it is rejected', () => {
    expect(() => Entry.create({ name: 'k', value: 'v', description: 'x'.repeat(1001) })).toThrow(
      InvalidDescriptionError,
    );
  });

  it('GIVEN a non-boolean env marker WHEN created THEN it is rejected', () => {
    expect(() => Entry.create({ name: 'k', value: 'v', envDependent: 'true' })).toThrow(
      InvalidEnvDependentError,
    );
  });
});

describe('Entry.with', () => {
  const base = Entry.create({
    name: 'key',
    value: 'v',
    description: 'doc',
    envDependent: true,
    createdAt: created,
    modifiedAt: modified,
  });

  it('GIVEN an empty patch WHEN applied THEN nothing changes', () => {
    const next = base.with({});

    expect(next.hasSameContent(base)).toBe(true);
    expect(next.createdAt).toBe(created);
    expect(next.modifiedAt).toBe(modified);
  });

  it('GIVEN a full patch WHEN applied THEN every field changes', () => {
    const next = base.with({ name: 'other', value: 'w', description: 'new', envDependent: false });

    expect(next.name).toBe('other');
    expect(next.value).toBe('w');
    expect(next.description).toBe('new');
    expect(next.envDependent).toBe(false);
  });

  it('GIVEN a blank description patch WHEN applied THEN the description is cleared', () => {
    expect(base.with({ description: '   ' }).description).toBeUndefined();
  });

  it('GIVEN invalid patch fields WHEN applied THEN they are rejected', () => {
    expect(() => base.with({ name: '-x' })).toThrow(InvalidResourceNameError);
    expect(() => base.with({ value: 5 })).toThrow(InvalidEntryValueError);
    expect(() => base.with({ description: 5 })).toThrow(InvalidDescriptionError);
    expect(() => base.with({ envDependent: 'no' })).toThrow(InvalidEnvDependentError);
  });
});

describe('Entry.withTimestamps', () => {
  it('GIVEN new timestamps WHEN applied THEN content is unchanged', () => {
    const entry = Entry.create({ name: 'k', value: 'v', description: 'd', envDependent: true });
    const stamped = entry.withTimestamps(created, modified);

    expect(stamped.createdAt).toBe(created);
    expect(stamped.modifiedAt).toBe(modified);
    expect(stamped.hasSameContent(entry)).toBe(true);
    expect(entry.createdAt).toBeUndefined();
  });
});

describe('Entry.hasSameContent', () => {
  const base = Entry.create({ name: 'k', value: 'v', description: 'd', envDependent: true });

  it('GIVEN identical content with different timestamps WHEN compared THEN it is the same', () => {
    expect(base.hasSameContent(base.withTimestamps(created, modified))).toBe(true);
  });

  it.each([
    ['name', { name: 'other' }],
    ['value', { value: 'other' }],
    ['description', { description: 'other' }],
    ['envDependent', { envDependent: false }],
  ])('GIVEN a different %s WHEN compared THEN it is not the same', (_field, patch) => {
    expect(base.hasSameContent(base.with(patch))).toBe(false);
  });
});
