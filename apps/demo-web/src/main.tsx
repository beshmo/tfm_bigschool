import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { OkvnsWrapper } from '@okvns/wrapper';
import { App } from './App';
import { getApiBaseUrl } from './config';
import './styles.css';

const okvns = new OkvnsWrapper({ baseUrl: getApiBaseUrl() });
const container = document.getElementById('root');

if (!container) {
  throw new Error('Root container not found');
}

createRoot(container).render(
  <StrictMode>
    <App okvns={okvns} />
  </StrictMode>,
);
