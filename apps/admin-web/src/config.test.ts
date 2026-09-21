import { describe, expect, it } from 'vitest';
import { DEFAULT_API_BASE_URL, resolveApiBaseUrl } from './config';

describe('resolveApiBaseUrl', () => {
  it('GIVEN a runtime-injected URL WHEN resolved THEN it wins over the build-time URL', () => {
    expect(
      resolveApiBaseUrl(
        { __OKVNS_API_BASE_URL__: 'https://runtime.example' },
        'https://build.example',
      ),
    ).toBe('https://runtime.example');
  });

  it('GIVEN an empty runtime URL WHEN resolved THEN the build-time URL is used', () => {
    expect(resolveApiBaseUrl({ __OKVNS_API_BASE_URL__: '' }, 'https://build.example')).toBe(
      'https://build.example',
    );
    expect(resolveApiBaseUrl({}, 'https://build.example')).toBe('https://build.example');
  });

  it('GIVEN neither WHEN resolved THEN the default is http://localhost:3000', () => {
    expect(resolveApiBaseUrl({}, undefined)).toBe('http://localhost:3000');
    expect(DEFAULT_API_BASE_URL).toBe('http://localhost:3000');
  });

  it('GIVEN trailing slashes WHEN resolved THEN they are removed', () => {
    expect(resolveApiBaseUrl({ __OKVNS_API_BASE_URL__: 'https://api.example///' }, undefined)).toBe(
      'https://api.example',
    );
  });

  it('GIVEN no arguments WHEN resolved THEN the window and build environment are read', () => {
    expect(typeof resolveApiBaseUrl()).toBe('string');
  });
});
