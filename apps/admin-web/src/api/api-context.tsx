import { createContext, useContext, type ReactNode } from 'react';
import type { OkvnsApi } from './okvns-api';

const ApiContext = createContext<OkvnsApi | null>(null);

export function ApiProvider({ api, children }: { api: OkvnsApi; children: ReactNode }) {
  return <ApiContext.Provider value={api}>{children}</ApiContext.Provider>;
}

export function useApi(): OkvnsApi {
  const api = useContext(ApiContext);
  if (!api) {
    throw new Error('useApi must be used within an ApiProvider');
  }
  return api;
}
