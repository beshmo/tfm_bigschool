import { describe, expect, it } from 'vitest';
import { screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { FakeOkvnsApi } from '../test/fake-api';
import { renderApp } from '../test/render';

function seededApi() {
  const api = new FakeOkvnsApi();
  api.seed([{ name: 'users', entries: [{ name: 'admin', value: 'secret' }] }]);
  return api;
}

describe('NamespaceDetailPage', () => {
  it('shows the namespace and its entries', async () => {
    renderApp(seededApi(), '/namespaces/users');
    expect(await screen.findByRole('heading', { name: 'Namespace: users' })).toBeInTheDocument();
    expect(screen.getByLabelText('Value for admin')).toHaveValue('secret');
  });

  it('creates a new entry', async () => {
    renderApp(seededApi(), '/namespaces/users');
    await screen.findByRole('heading', { name: 'Namespace: users' });

    await userEvent.type(screen.getByLabelText('Entry name'), 'token');
    await userEvent.type(screen.getByLabelText('Entry value'), 'abc');
    await userEvent.click(screen.getByRole('button', { name: 'Add entry' }));

    expect(await screen.findByLabelText('Value for token')).toHaveValue('abc');
  });

  it('shows a validation error when creating a duplicate entry', async () => {
    renderApp(seededApi(), '/namespaces/users');
    await screen.findByRole('heading', { name: 'Namespace: users' });

    await userEvent.type(screen.getByLabelText('Entry name'), 'admin');
    await userEvent.type(screen.getByLabelText('Entry value'), 'x');
    await userEvent.click(screen.getByRole('button', { name: 'Add entry' }));

    expect(await screen.findByRole('alert')).toHaveTextContent(/already exists/i);
  });

  it('updates an entry value', async () => {
    renderApp(seededApi(), '/namespaces/users');
    const valueInput = await screen.findByLabelText('Value for admin');
    await userEvent.clear(valueInput);
    await userEvent.type(valueInput, 'rotated');
    await userEvent.click(screen.getByRole('button', { name: 'Save' }));

    await waitFor(() => expect(screen.getByLabelText('Value for admin')).toHaveValue('rotated'));
  });

  it('deletes an entry', async () => {
    renderApp(seededApi(), '/namespaces/users');
    await screen.findByLabelText('Value for admin');
    await userEvent.click(screen.getByRole('button', { name: 'Delete entry admin' }));
    await waitFor(() => expect(screen.queryByLabelText('Value for admin')).toBeNull());
  });
});
