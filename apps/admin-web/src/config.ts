declare global {
  interface Window {
    __OKVNS_API_BASE_URL__?: string;
  }
}

/**
 * Resolves the OKVNS API base URL, preferring a runtime-injected value
 * (`window.__OKVNS_API_BASE_URL__`, written by the container entrypoint from an
 * environment variable), then the build-time env, then a local default.
 */
export function getApiBaseUrl(): string {
  const runtime = typeof window !== 'undefined' ? window.__OKVNS_API_BASE_URL__ : undefined;
  if (typeof runtime === 'string' && runtime.length > 0) {
    return runtime;
  }
  return import.meta.env.VITE_OKVNS_API_BASE_URL ?? 'http://localhost:3000';
}

export function getAppVersion(): string {
  return __OKVNS_ADMIN_VERSION__;
}
