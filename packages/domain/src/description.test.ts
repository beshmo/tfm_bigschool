import { describe, expect, it } from 'vitest';
import { normalizeDescription } from './description.js';
import { normalizeEnvDependent } from './env-dependent.js';
import { InvalidDescriptionError, InvalidEnvDependentError } from './errors.js';

describe('normalizeDescription', () => {
  it.each([undefined, null, '', '   ', '\n\t'])(
    'GIVEN %j WHEN normalized THEN there is no description',
    (input) => {
      expect(normalizeDescription(input)).toBeUndefined();
    },
  );

  it('GIVEN a padded description WHEN normalized THEN it is trimmed', () => {
    expect(normalizeDescription('  hello  ')).toBe('hello');
  });

  it('GIVEN exactly 1000 characters WHEN normalized THEN it is accepted', () => {
    expect(normalizeDescription('x'.repeat(1000))).toHaveLength(1000);
  });

  it('GIVEN 1001 characters WHEN normalized THEN it is rejected', () => {
    expect(() => normalizeDescription('x'.repeat(1001))).toThrow(InvalidDescriptionError);
    expect(() => normalizeDescription('x'.repeat(1001), 'Entry description')).toThrow(
      'Entry description must be at most 1000 characters.',
    );
  });

  it.each([1, true, {}, []])(
    'GIVEN the non-string %j WHEN normalized THEN it is rejected',
    (input) => {
      expect(() => normalizeDescription(input)).toThrow('Description must be a string.');
    },
  );
});

describe('normalizeEnvDependent', () => {
  it('GIVEN nothing WHEN normalized THEN it defaults to false', () => {
    expect(normalizeEnvDependent(undefined)).toBe(false);
  });

  it.each([true, false])('GIVEN the boolean %s WHEN normalized THEN it is kept', (value) => {
    expect(normalizeEnvDependent(value)).toBe(value);
  });

  it.each(['true', 'false', 1, 0, null, {}])(
    'GIVEN the non-boolean %j WHEN normalized THEN it is rejected',
    (value) => {
      expect(() => normalizeEnvDependent(value)).toThrow(InvalidEnvDependentError);
    },
  );
});
