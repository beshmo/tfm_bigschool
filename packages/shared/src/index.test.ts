import { describe, expect, it } from 'vitest';
import {
  DEFAULT_PAGE_SIZE,
  ERROR_CODES,
  PAGE_SIZES,
  RESOURCE_NAME_MAX_LENGTH,
  RESOURCE_NAME_PATTERN,
  compareNames,
  isPageSize,
  totalPages,
} from './index.js';

describe('RESOURCE_NAME_PATTERN', () => {
  it.each(['users', 'db-host', 'a.b_c', 'Ünïcode1', '9lives', '日本語'])(
    'GIVEN %s WHEN tested THEN it is an allowed name',
    (name) => {
      expect(RESOURCE_NAME_PATTERN.test(name)).toBe(true);
    },
  );

  it.each(['', '-leading', '.dot', '_under', 'has space', 'slash/name', 'semi;colon'])(
    'GIVEN %j WHEN tested THEN it is rejected',
    (name) => {
      expect(RESOURCE_NAME_PATTERN.test(name)).toBe(false);
    },
  );

  it('GIVEN the limits WHEN read THEN names are capped at 128 characters', () => {
    expect(RESOURCE_NAME_MAX_LENGTH).toBe(128);
  });
});

describe('ERROR_CODES', () => {
  it('GIVEN the contract WHEN listed THEN every documented code is present', () => {
    expect(Object.values(ERROR_CODES).sort()).toEqual([
      'DUPLICATE_ENTRY',
      'DUPLICATE_NAMESPACE',
      'ENTRY_NOT_FOUND',
      'INTERNAL_ERROR',
      'INVALID_YAML',
      'NAMESPACE_NOT_FOUND',
      'VALIDATION_ERROR',
    ]);
  });
});

describe('isPageSize', () => {
  it.each(PAGE_SIZES)('GIVEN %i WHEN checked THEN it is an allowed page size', (size) => {
    expect(isPageSize(size)).toBe(true);
  });

  it.each([0, 25, 101, '10', undefined, null])(
    'GIVEN %j WHEN checked THEN it is not an allowed page size',
    (value) => {
      expect(isPageSize(value)).toBe(false);
    },
  );

  it('GIVEN the default WHEN checked THEN it is an allowed page size', () => {
    expect(isPageSize(DEFAULT_PAGE_SIZE)).toBe(true);
  });
});

describe('totalPages', () => {
  it('GIVEN no items WHEN computed THEN there are zero pages', () => {
    expect(totalPages(0, 10)).toBe(0);
  });

  it.each([
    [1, 1],
    [10, 1],
    [11, 2],
    [100, 10],
  ])('GIVEN %i items at page size 10 WHEN computed THEN there are %i pages', (items, pages) => {
    expect(totalPages(items, 10)).toBe(pages);
  });
});

describe('compareNames', () => {
  it('GIVEN two names WHEN compared THEN ordering is by code unit, not locale', () => {
    expect(compareNames('a', 'b')).toBe(-1);
    expect(compareNames('b', 'a')).toBe(1);
    expect(compareNames('a', 'a')).toBe(0);
    expect(compareNames('B', 'a')).toBe(-1);
  });
});
