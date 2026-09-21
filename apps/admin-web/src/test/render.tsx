import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import type { ReactElement } from 'react';
import { MemoryRouter } from 'react-router-dom';
import { ApiProvider } from '../api/api-context';
import { ToastProvider } from '../components/Toast';
import { FakeApi } from './fake-api';

interface RenderOptions {
  api?: FakeApi;
  route?: string;
}

/** Renders a tree inside the same providers as `main.tsx`, backed by a fake API. */
export function renderWithProviders(ui: ReactElement, options: RenderOptions = {}) {
  const api = options.api ?? new FakeApi();
  const user = userEvent.setup();
  const view = render(
    <MemoryRouter initialEntries={[options.route ?? '/']}>
      <ApiProvider api={api}>
        <ToastProvider>{ui}</ToastProvider>
      </ApiProvider>
    </MemoryRouter>,
  );
  return { api, user, ...view };
}

/** The toast currently on screen, looked up inside the notifications region only. */
export function toast(): HTMLElement {
  return within(screen.getByRole('region', { name: 'Notifications' })).getByRole('status');
}
