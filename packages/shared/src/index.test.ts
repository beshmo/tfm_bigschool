import { describe, expect, it } from 'vitest';
import {
  compareNames,
  isPageSize,
  totalPages,
  DEFAULT_PAGE_SIZE,
  ENTRY_SORT_FIELDS,
  NAMESPACE_SORT_FIELDS,
  PAGE_SIZES,
  RESOURCE_NAME_PATTERN,
  SORT_DIRECTIONS,
} from './index.js';

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

describe('isPageSize', () => {
  it('GIVEN a page size WHEN it is allowlisted THEN it is accepted', () => {
    for (const size of PAGE_SIZES) {
      expect(isPageSize(size)).toBe(true);
    }
  });

  it('GIVEN a page size WHEN it is not allowlisted THEN it is rejected', () => {
    expect(isPageSize(0)).toBe(false);
    expect(isPageSize(25)).toBe(false);
    expect(isPageSize(101)).toBe(false);
    expect(isPageSize(-10)).toBe(false);
  });

  it('GIVEN the default page size THEN it is allowlisted', () => {
    expect(isPageSize(DEFAULT_PAGE_SIZE)).toBe(true);
  });
});

describe('totalPages', () => {
  it('GIVEN items that fill whole pages THEN it counts those pages', () => {
    expect(totalPages(100, 10)).toBe(10);
    expect(totalPages(100, 50)).toBe(2);
  });

  it('GIVEN a partial trailing page THEN it is counted as a page', () => {
    expect(totalPages(101, 10)).toBe(11);
    expect(totalPages(1, 100)).toBe(1);
  });

  it('GIVEN no matching items THEN there are no pages', () => {
    expect(totalPages(0, 10)).toBe(0);
  });
});

describe('list query allowlists', () => {
  it('GIVEN the namespace sort fields THEN they cover name and timestamps', () => {
    expect([...NAMESPACE_SORT_FIELDS]).toEqual(['name', 'created_at', 'modified_at']);
  });

  it('GIVEN the entry sort fields THEN they add environment-dependence', () => {
    expect([...ENTRY_SORT_FIELDS]).toEqual(['name', 'created_at', 'modified_at', 'env_dependent']);
  });

  it('GIVEN the sort directions THEN both orderings are offered', () => {
    expect([...SORT_DIRECTIONS]).toEqual(['asc', 'desc']);
  });
});
