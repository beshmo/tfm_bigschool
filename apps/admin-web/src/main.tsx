import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import { App } from './App';
import { ApiProvider } from './api/api-context';
import { HttpOkvnsApi } from './api/okvns-api';
import { ToastProvider } from './components/Toast';
import { resolveApiBaseUrl } from './config';
import './styles.css';

const api = new HttpOkvnsApi(resolveApiBaseUrl());

createRoot(document.getElementById('root') as HTMLElement).render(
  <StrictMode>
    <BrowserRouter>
      <ApiProvider api={api}>
        <ToastProvider>
          <App />
        </ToastProvider>
      </ApiProvider>
    </BrowserRouter>
  </StrictMode>,
);
