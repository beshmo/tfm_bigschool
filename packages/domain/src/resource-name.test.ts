import { describe, expect, it } from 'vitest';
import { InvalidResourceNameError } from './errors.js';
import { ResourceName } from './resource-name.js';

describe('ResourceName', () => {
  it('GIVEN a padded valid name WHEN created THEN it is trimmed', () => {
    expect(ResourceName.create('  users-1  ').value).toBe('users-1');
  });

  it('GIVEN a name of exactly 128 characters WHEN created THEN it is accepted', () => {
    expect(ResourceName.create('a'.repeat(128)).value).toHaveLength(128);
  });

  it('GIVEN unicode letters WHEN created THEN they are accepted', () => {
    expect(ResourceName.create('Ünï-日本').value).toBe('Ünï-日本');
  });

  it.each([
    ['a non-string', 42, 'Name must be a string.'],
    ['an empty string', '', 'Name must not be empty.'],
    ['a blank string', '   ', 'Name must not be empty.'],
    ['129 characters', 'a'.repeat(129), 'Name must be at most 128 characters.'],
    ['a leading dash', '-abc', 'Name must start with a letter or digit'],
    ['a space inside', 'a b', 'Name must start with a letter or digit'],
  ])('GIVEN %s WHEN created THEN it is rejected', (_label, input, message) => {
    expect(() => ResourceName.create(input)).toThrow(InvalidResourceNameError);
    expect(() => ResourceName.create(input)).toThrow(message);
  });

  it('GIVEN a custom label WHEN creation fails THEN the label prefixes the message', () => {
    expect(() => ResourceName.create('', 'Namespace name')).toThrow(
      'Namespace name must not be empty.',
    );
  });

  it('GIVEN equal and different names WHEN compared THEN equals reflects the value', () => {
    expect(ResourceName.create('a').equals(ResourceName.create(' a '))).toBe(true);
    expect(ResourceName.create('a').equals(ResourceName.create('b'))).toBe(false);
  });

  it('GIVEN a name WHEN stringified THEN it is its value', () => {
    expect(String(ResourceName.create('abc'))).toBe('abc');
  });
});
