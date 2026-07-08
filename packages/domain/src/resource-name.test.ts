import { describe, expect, it } from 'vitest';
import { ResourceName } from './resource-name.js';
import { InvalidResourceNameError } from './errors.js';

describe('ResourceName', () => {
  it('GIVEN a valid name WHEN created THEN it is normalized by trimming', () => {
    const name = ResourceName.create('  users  ');
    expect(name.value).toBe('users');
  });

  it('GIVEN a name with allowed separators WHEN created THEN it is accepted', () => {
    expect(ResourceName.create('feature.flags_v-2').value).toBe('feature.flags_v-2');
  });

  it('GIVEN a UTF-8 name WHEN created THEN it is accepted', () => {
    expect(ResourceName.create('café').value).toBe('café');
  });

  it('GIVEN two equal names WHEN compared THEN they are equal', () => {
    expect(ResourceName.create('a').equals(ResourceName.create('a'))).toBe(true);
    expect(ResourceName.create('a').equals(ResourceName.create('b'))).toBe(false);
  });

  it('GIVEN a non-string WHEN created THEN it throws InvalidResourceNameError', () => {
    expect(() => ResourceName.create(42 as unknown as string)).toThrow(InvalidResourceNameError);
  });

  it('GIVEN an empty or whitespace name WHEN created THEN it throws', () => {
    expect(() => ResourceName.create('')).toThrow(InvalidResourceNameError);
    expect(() => ResourceName.create('   ')).toThrow(InvalidResourceNameError);
  });

  it('GIVEN a name starting with a separator WHEN created THEN it throws', () => {
    expect(() => ResourceName.create('-bad')).toThrow(InvalidResourceNameError);
    expect(() => ResourceName.create('.bad')).toThrow(InvalidResourceNameError);
  });

  it('GIVEN a name with disallowed characters WHEN created THEN it throws', () => {
    expect(() => ResourceName.create('bad name')).toThrow(InvalidResourceNameError);
    expect(() => ResourceName.create('bad/name')).toThrow(InvalidResourceNameError);
  });

  it('GIVEN a name longer than the max length WHEN created THEN it throws', () => {
    expect(() => ResourceName.create('a'.repeat(129))).toThrow(InvalidResourceNameError);
  });
});
