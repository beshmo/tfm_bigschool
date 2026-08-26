import { describe, expect, it, vi } from 'vitest';
import { screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { FakeOkvnsApi } from '../test/fake-api';
import { renderApp } from '../test/render';

/** Answers the confirmation dialog that every delete now opens. */
async function confirmDelete() {
  const dialog = within(screen.getByRole('alertdialog'));
  await userEvent.click(dialog.getByRole('button', { name: 'Delete' }));
}

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

    // Dates render in the design's format; the ISO instant stays machine-readable
    // on the <time> element behind it.
    expect(screen.getByText('May 1, 2024')).toHaveAttribute('datetime', '2024-05-01T00:00:00.000Z');
    expect(screen.getByText('Jun 1, 2024')).toHaveAttribute('datetime', '2024-06-01T00:00:00.000Z');
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

  it('deletes a namespace once the deletion is confirmed', async () => {
    const api = new FakeOkvnsApi();
    api.seed([{ name: 'users', entries: [] }]);
    renderApp(api);
    await screen.findByRole('link', { name: 'users' });

    await userEvent.click(screen.getByRole('button', { name: 'Delete namespace users' }));
    await confirmDelete();

    await waitFor(() => expect(screen.queryByRole('link', { name: 'users' })).toBeNull());
  });

  it('keeps a namespace when the delete confirmation is cancelled', async () => {
    const api = new FakeOkvnsApi();
    const deleteNamespace = vi.spyOn(api, 'deleteNamespace');
    api.seed([{ name: 'users', entries: [] }]);
    renderApp(api);
    await screen.findByRole('link', { name: 'users' });

    await userEvent.click(screen.getByRole('button', { name: 'Delete namespace users' }));
    await userEvent.click(
      within(screen.getByRole('alertdialog')).getByRole('button', { name: 'Cancel' }),
    );

    expect(deleteNamespace).not.toHaveBeenCalled();
    expect(screen.getByRole('link', { name: 'users' })).toBeInTheDocument();
  });
});

describe('NamespacesPage list controls', () => {
  /** Seeds `count` namespaces named ns-001, ns-002, … in name order. */
  function seedMany(api: FakeOkvnsApi, count: number): void {
    api.seed(
      Array.from({ length: count }, (_, index) => ({
        name: `ns-${String(index + 1).padStart(3, '0')}`,
        entries: [],
      })),
    );
  }

  it('requests the selected page size from the API', async () => {
    const api = new FakeOkvnsApi();
    const listNamespaces = vi.spyOn(api, 'listNamespaces');
    seedMany(api, 12);
    renderApp(api);
    await screen.findByRole('link', { name: 'ns-001' });

    // The default page of 10 leaves the 11th and 12th on a second page.
    expect(screen.queryByRole('link', { name: 'ns-011' })).toBeNull();

    await userEvent.selectOptions(screen.getByLabelText('Per page'), '50');

    expect(await screen.findByRole('link', { name: 'ns-011' })).toBeInTheDocument();
    expect(listNamespaces).toHaveBeenLastCalledWith(expect.objectContaining({ page_size: 50 }));
  });

  it('shows pagination metadata from the API', async () => {
    const api = new FakeOkvnsApi();
    seedMany(api, 12);
    renderApp(api);
    await screen.findByRole('link', { name: 'ns-001' });

    expect(screen.getByText(/Page 1 of 2 \(12 total\)/)).toBeInTheDocument();
  });

  it('navigates between pages, requesting each page from the API', async () => {
    const api = new FakeOkvnsApi();
    const listNamespaces = vi.spyOn(api, 'listNamespaces');
    seedMany(api, 12);
    renderApp(api);
    await screen.findByRole('link', { name: 'ns-001' });

    await userEvent.click(screen.getByRole('button', { name: 'Next page of namespaces' }));

    expect(await screen.findByRole('link', { name: 'ns-011' })).toBeInTheDocument();
    expect(screen.queryByRole('link', { name: 'ns-001' })).toBeNull();
    expect(listNamespaces).toHaveBeenLastCalledWith(expect.objectContaining({ page: 2 }));
  });

  it('disables previous on the first page and next on the last', async () => {
    const api = new FakeOkvnsApi();
    seedMany(api, 12);
    renderApp(api);
    await screen.findByRole('link', { name: 'ns-001' });

    expect(screen.getByRole('button', { name: 'Previous page of namespaces' })).toBeDisabled();
    expect(screen.getByRole('button', { name: 'Next page of namespaces' })).toBeEnabled();

    await userEvent.click(screen.getByRole('button', { name: 'Next page of namespaces' }));

    await waitFor(() =>
      expect(screen.getByRole('button', { name: 'Next page of namespaces' })).toBeDisabled(),
    );
    expect(screen.getByRole('button', { name: 'Previous page of namespaces' })).toBeEnabled();
  });

  it('requests the selected ordering from the API', async () => {
    const api = new FakeOkvnsApi();
    const listNamespaces = vi.spyOn(api, 'listNamespaces');
    api.seed([
      { name: 'alpha', entries: [], created_at: '2024-01-02T00:00:00.000Z' },
      { name: 'zeta', entries: [], created_at: '2024-01-01T00:00:00.000Z' },
    ]);
    renderApp(api);
    await screen.findByRole('link', { name: 'alpha' });

    await userEvent.selectOptions(screen.getByLabelText('Order by'), 'created_at');

    await waitFor(() =>
      expect(listNamespaces).toHaveBeenLastCalledWith(
        expect.objectContaining({ sort: 'created_at' }),
      ),
    );
    // The list reflects the API's ordering: zeta was created first.
    const links = await screen.findAllByRole('link', { name: /alpha|zeta/ });
    expect(links.map((el) => el.textContent)).toEqual(['zeta', 'alpha']);
  });

  it('requests the selected sort direction from the API', async () => {
    const api = new FakeOkvnsApi();
    api.seed([
      { name: 'alpha', entries: [] },
      { name: 'zeta', entries: [] },
    ]);
    renderApp(api);
    await screen.findByRole('link', { name: 'alpha' });

    await userEvent.selectOptions(screen.getByLabelText('Direction'), 'desc');

    await waitFor(() => {
      const links = screen.getAllByRole('link', { name: /alpha|zeta/ });
      expect(links.map((el) => el.textContent)).toEqual(['zeta', 'alpha']);
    });
  });

  it('filters by name through the API', async () => {
    const api = new FakeOkvnsApi();
    const listNamespaces = vi.spyOn(api, 'listNamespaces');
    api.seed([
      { name: 'users', entries: [] },
      { name: 'flags', entries: [] },
    ]);
    renderApp(api);
    await screen.findByRole('link', { name: 'users' });

    await userEvent.type(screen.getByLabelText('Filter by name'), 'user');

    await waitFor(() => expect(screen.queryByRole('link', { name: 'flags' })).toBeNull());
    expect(screen.getByRole('link', { name: 'users' })).toBeInTheDocument();
    expect(listNamespaces).toHaveBeenLastCalledWith(expect.objectContaining({ name: 'user' }));
  });

  it('reports when a filter matches nothing', async () => {
    const api = new FakeOkvnsApi();
    api.seed([{ name: 'users', entries: [] }]);
    renderApp(api);
    await screen.findByRole('link', { name: 'users' });

    await userEvent.type(screen.getByLabelText('Filter by name'), 'nope');

    expect(await screen.findByText('No namespaces match the filter.')).toBeInTheDocument();
  });

  it('returns to the first page when the filter changes', async () => {
    const api = new FakeOkvnsApi();
    const listNamespaces = vi.spyOn(api, 'listNamespaces');
    seedMany(api, 12);
    renderApp(api);
    await screen.findByRole('link', { name: 'ns-001' });

    await userEvent.click(screen.getByRole('button', { name: 'Next page of namespaces' }));
    await screen.findByRole('link', { name: 'ns-011' });

    await userEvent.type(screen.getByLabelText('Filter by name'), 'ns-0');

    // Page 2 of the unfiltered list may not exist once filtered, so the query
    // resets to page 1 rather than stranding the admin on an empty page.
    await waitFor(() =>
      expect(listNamespaces).toHaveBeenLastCalledWith(expect.objectContaining({ page: 1 })),
    );
  });

  it('steps back a page when deleting the last namespace on the current page', async () => {
    const api = new FakeOkvnsApi();
    seedMany(api, 11);
    renderApp(api);
    await screen.findByRole('link', { name: 'ns-001' });

    await userEvent.click(screen.getByRole('button', { name: 'Next page of namespaces' }));
    // Page 2 holds exactly one namespace; deleting it empties the page.
    await screen.findByRole('link', { name: 'ns-011' });

    await userEvent.click(screen.getByRole('button', { name: 'Delete namespace ns-011' }));
    await confirmDelete();

    expect(await screen.findByRole('link', { name: 'ns-001' })).toBeInTheDocument();
    expect(screen.getByText(/Page 1 of 1 \(10 total\)/)).toBeInTheDocument();
  });

  it('reloads the active query after creating a namespace', async () => {
    const api = new FakeOkvnsApi();
    const listNamespaces = vi.spyOn(api, 'listNamespaces');
    api.seed([{ name: 'flags', entries: [] }]);
    renderApp(api);
    await screen.findByRole('link', { name: 'flags' });

    await userEvent.selectOptions(screen.getByLabelText('Direction'), 'desc');
    await waitFor(() =>
      expect(listNamespaces).toHaveBeenLastCalledWith(
        expect.objectContaining({ direction: 'desc' }),
      ),
    );

    await userEvent.type(screen.getByLabelText('Namespace name'), 'users');
    await userEvent.click(screen.getByRole('button', { name: 'Create namespace' }));

    // The reload keeps the admin's chosen ordering rather than resetting it.
    expect(await screen.findByRole('link', { name: 'users' })).toBeInTheDocument();
    expect(listNamespaces).toHaveBeenLastCalledWith(expect.objectContaining({ direction: 'desc' }));
  });
});
