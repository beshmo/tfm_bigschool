import { describe, expect, it } from 'vitest';
import { screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { FakeOkvnsApi } from '../test/fake-api';
import { renderApp } from '../test/render';

describe('NamespacesPage', () => {
  it('lists existing namespaces in order', async () => {
    const api = new FakeOkvnsApi();
    api.seed([
      { name: 'zeta', entries: [] },
      { name: 'alpha', entries: [] },
    ]);
    renderApp(api);
    const items = await screen.findAllByRole('link', { name: /alpha|zeta/ });
    expect(items.map((el) => el.textContent)).toEqual(['alpha', 'zeta']);
  });

  it('creates a namespace and shows it, resetting the form', async () => {
    const api = new FakeOkvnsApi();
    renderApp(api);
    await screen.findByText('No namespaces yet.');

    const input = screen.getByLabelText('Namespace name');
    await userEvent.type(input, 'users');
    await userEvent.click(screen.getByRole('button', { name: 'Create namespace' }));

    expect(await screen.findByRole('link', { name: 'users' })).toBeInTheDocument();
    expect(input).toHaveValue('');
  });

  it('shows a safe API error when creating a duplicate namespace', async () => {
    const api = new FakeOkvnsApi();
    api.seed([{ name: 'users', entries: [] }]);
    renderApp(api);
    await screen.findByRole('link', { name: 'users' });

    await userEvent.type(screen.getByLabelText('Namespace name'), 'users');
    await userEvent.click(screen.getByRole('button', { name: 'Create namespace' }));

    expect(await screen.findByRole('alert')).toHaveTextContent(/already exists/i);
  });

  it('deletes a namespace', async () => {
    const api = new FakeOkvnsApi();
    api.seed([{ name: 'users', entries: [] }]);
    renderApp(api);
    await screen.findByRole('link', { name: 'users' });

    await userEvent.click(screen.getByRole('button', { name: 'Delete namespace users' }));
    await waitFor(() => expect(screen.queryByRole('link', { name: 'users' })).toBeNull());
  });
});
