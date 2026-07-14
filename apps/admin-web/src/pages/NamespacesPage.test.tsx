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

  it('displays namespace created and modified timestamps', async () => {
    const api = new FakeOkvnsApi();
    api.seed([
      {
        name: 'users',
        entries: [],
        created_at: '2024-05-01T00:00:00.000Z',
        modified_at: '2024-06-01T00:00:00.000Z',
      },
    ]);
    renderApp(api);
    await screen.findByRole('link', { name: 'users' });

    expect(screen.getByText('2024-05-01T00:00:00.000Z')).toBeInTheDocument();
    expect(screen.getByText('2024-06-01T00:00:00.000Z')).toBeInTheDocument();
  });

  it('creates a namespace with a description and shows it, resetting the form', async () => {
    const api = new FakeOkvnsApi();
    renderApp(api);
    await screen.findByText('No namespaces yet.');

    await userEvent.type(screen.getByLabelText('Namespace name'), 'users');
    const descriptionInput = screen.getByLabelText('Description (optional)');
    await userEvent.type(descriptionInput, 'Accounts for the admin console.');
    await userEvent.click(screen.getByRole('button', { name: 'Create namespace' }));

    expect(await screen.findByText('Accounts for the admin console.')).toBeInTheDocument();
    expect(descriptionInput).toHaveValue('');
  });

  it('displays a stored namespace description', async () => {
    const api = new FakeOkvnsApi();
    api.seed([{ name: 'users', description: 'the users', entries: [] }]);
    renderApp(api);

    expect(await screen.findByText('the users')).toBeInTheDocument();
  });

  it('shows a validation error for an oversized namespace description', async () => {
    const api = new FakeOkvnsApi();
    renderApp(api);
    await screen.findByText('No namespaces yet.');

    await userEvent.type(screen.getByLabelText('Namespace name'), 'users');
    // `paste` avoids typing 1001 characters one keystroke at a time.
    await userEvent.click(screen.getByLabelText('Description (optional)'));
    await userEvent.paste('x'.repeat(1001));
    await userEvent.click(screen.getByRole('button', { name: 'Create namespace' }));

    expect(await screen.findByRole('alert')).toBeInTheDocument();
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
