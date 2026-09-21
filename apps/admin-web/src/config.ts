export const DEFAULT_API_BASE_URL = 'http://localhost:3000';

/**
 * Resolves the API base URL: the container-injected `window.__OKVNS_API_BASE_URL__`
 * first, then the build-time `VITE_OKVNS_API_BASE_URL`, then a default.
 */
export function resolveApiBaseUrl(
  runtime: { __OKVNS_API_BASE_URL__?: string } = window,
  buildTime: string | undefined = import.meta.env.VITE_OKVNS_API_BASE_URL,
): string {
  const url = runtime.__OKVNS_API_BASE_URL__ || buildTime || DEFAULT_API_BASE_URL;
  return url.replace(/\/+$/, '');
}
