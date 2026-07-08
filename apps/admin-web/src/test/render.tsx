import { render } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { ApiProvider } from '../api/api-context';
import type { OkvnsApi } from '../api/okvns-api';
import { App } from '../App';

/** Renders the full app wired to a fake API at a given route. */
export function renderApp(api: OkvnsApi, initialPath = '/') {
  return render(
    <ApiProvider api={api}>
      <MemoryRouter initialEntries={[initialPath]}>
        <App />
      </MemoryRouter>
    </ApiProvider>,
  );
}
