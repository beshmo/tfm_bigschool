/// <reference types="vite/client" />

/** Admin package version, injected at build time by vite.config.ts. */
declare const __APP_VERSION__: string;

interface Window {
  /** Set by public/env.js (container-injected); empty or absent falls back to the build-time URL. */
  __OKVNS_API_BASE_URL__?: string;
}
