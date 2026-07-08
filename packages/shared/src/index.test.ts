import { describe, expect, it } from 'vitest';
import { compareNames, RESOURCE_NAME_PATTERN } from './index.js';

describe('compareNames', () => {
  it('orders names deterministically', () => {
    expect(compareNames('a', 'b')).toBe(-1);
    expect(compareNames('b', 'a')).toBe(1);
    expect(compareNames('a', 'a')).toBe(0);
  });
});

describe('RESOURCE_NAME_PATTERN', () => {
  it('accepts allowlisted names and rejects others', () => {
    expect(RESOURCE_NAME_PATTERN.test('users')).toBe(true);
    expect(RESOURCE_NAME_PATTERN.test('feature.flags_v-2')).toBe(true);
    expect(RESOURCE_NAME_PATTERN.test('bad name')).toBe(false);
    expect(RESOURCE_NAME_PATTERN.test('-bad')).toBe(false);
  });
});
