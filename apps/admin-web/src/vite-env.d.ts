/// <reference types="vite/client" />

declare const __OKVNS_ADMIN_VERSION__: string;

interface ImportMetaEnv {
  readonly VITE_OKVNS_API_BASE_URL?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
