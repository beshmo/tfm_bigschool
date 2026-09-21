import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { OkvnsWrapper } from '@okvns/wrapper';
import { App } from './App';
import { resolveApiBaseUrl } from './config';
import './styles.css';

const wrapper = new OkvnsWrapper({ baseUrl: resolveApiBaseUrl() });

createRoot(document.getElementById('root') as HTMLElement).render(
  <StrictMode>
    <App wrapper={wrapper} />
  </StrictMode>,
);
