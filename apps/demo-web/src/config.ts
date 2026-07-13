declare global {
  interface Window {
    __OKVNS_API_BASE_URL__?: string;
  }
}

export function getApiBaseUrl(): string {
  const runtime = typeof window !== 'undefined' ? window.__OKVNS_API_BASE_URL__ : undefined;
  if (typeof runtime === 'string' && runtime.length > 0) {
    return runtime;
  }
  return import.meta.env.VITE_OKVNS_API_BASE_URL ?? 'http://localhost:3000';
}
