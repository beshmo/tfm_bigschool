import { createContext, useContext, type ReactNode } from 'react';
import type { OkvnsApi } from './okvns-api';

const ApiContext = createContext<OkvnsApi | undefined>(undefined);

export function ApiProvider({ api, children }: { api: OkvnsApi; children: ReactNode }) {
  return <ApiContext.Provider value={api}>{children}</ApiContext.Provider>;
}

/** Components reach the API only through this hook, never through `fetch`. */
export function useApi(): OkvnsApi {
  const api = useContext(ApiContext);
  if (!api) {
    throw new Error('useApi must be used inside an ApiProvider.');
  }
  return api;
}
