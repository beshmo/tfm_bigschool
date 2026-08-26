import { describe, expect, it, vi } from 'vitest';
import { screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { FakeOkvnsApi } from '../test/fake-api';
import { renderApp } from '../test/render';

function seededApi() {
  const api = new FakeOkvnsApi();
  api.seed([{ name: 'users', entries: [{ name: 'admin', value: 'secret' }] }]);
  return api;
}

/**
 * Entry rows are read-only line drawings, so an entry's presence is asserted
 * through its row actions rather than through an inline input.
 */
function entryRowAction(action: 'Edit' | 'Delete', entry: string) {
  return screen.queryByRole('button', { name: `${action} entry ${entry}` });
}

/** Opens the edit dialog for an entry. */
async function openEditor(entry: string) {
  await userEvent.click(screen.getByRole('button', { name: `Edit entry ${entry}` }));
  return within(screen.getByRole('dialog'));
}

/** Answers the confirmation dialog that every delete now opens. */
async function confirmDelete() {
  const dialog = within(screen.getByRole('alertdialog'));
  await userEvent.click(dialog.getByRole('button', { name: 'Delete' }));
}

/** Saves the open edit dialog. */
async function saveEditor() {
  await userEvent.click(within(screen.getByRole('dialog')).getByRole('button', { name: 'Save' }));
}

describe('NamespaceDetailPage', () => {
  it('shows the namespace and its entries', async () => {
    renderApp(seededApi(), '/namespaces/users');
    expect(await screen.findByRole('heading', { name: 'users' })).toBeInTheDocument();
    expect(screen.getByText('secret')).toBeInTheDocument();
  });

  it('displays namespace and entry timestamps', async () => {
    const api = new FakeOkvnsApi();
    api.seed([
      {
        name: 'users',
        created_at: '2024-01-02T00:00:00.000Z',
        modified_at: '2024-01-03T00:00:00.000Z',
        entries: [
          {
            name: 'admin',
            value: 'secret',
            created_at: '2024-02-02T00:00:00.000Z',
            modified_at: '2024-02-03T00:00:00.000Z',
          },
        ],
      },
    ]);
    renderApp(api, '/namespaces/users');
    await screen.findByRole('heading', { name: 'users' });

    // The namespace's own timestamps sit in the page subheading; the entries
    // table carries only the modified date, as the design specifies.
    expect(screen.getByText(/Created Jan 2, 2024 · Modified Jan 3, 2024/)).toBeInTheDocument();
    expect(screen.getByText('Feb 3, 2024')).toBeInTheDocument();
  });

  it('creates a new entry', async () => {
    renderApp(seededApi(), '/namespaces/users');
    await screen.findByRole('heading', { name: 'users' });

    await userEvent.type(screen.getByLabelText('Entry name'), 'token');
    await userEvent.type(screen.getByLabelText('Entry value'), 'abc');
    await userEvent.click(screen.getByRole('button', { name: 'Add entry' }));

    expect(await screen.findByText('abc')).toBeInTheDocument();
    expect(entryRowAction('Edit', 'token')).toBeInTheDocument();
  });

  it('shows a validation error when creating a duplicate entry', async () => {
    renderApp(seededApi(), '/namespaces/users');
    await screen.findByRole('heading', { name: 'users' });

    await userEvent.type(screen.getByLabelText('Entry name'), 'admin');
    await userEvent.type(screen.getByLabelText('Entry value'), 'x');
    await userEvent.click(screen.getByRole('button', { name: 'Add entry' }));

    expect(await screen.findByRole('alert')).toHaveTextContent(/already exists/i);
  });

  it('updates an entry value through the edit dialog', async () => {
    renderApp(seededApi(), '/namespaces/users');
    await screen.findByRole('heading', { name: 'users' });

    const dialog = await openEditor('admin');
    const valueInput = dialog.getByLabelText('Value for admin');
    await userEvent.clear(valueInput);
    await userEvent.type(valueInput, 'rotated');
    await saveEditor();

    expect(await screen.findByText('rotated')).toBeInTheDocument();
  });

  it('displays stored namespace and entry descriptions', async () => {
    const api = new FakeOkvnsApi();
    api.seed([
      {
        name: 'users',
        description: 'the users namespace',
        entries: [{ name: 'admin', value: 'secret', description: 'the admin key' }],
      },
    ]);
    renderApp(api, '/namespaces/users');
    await screen.findByRole('heading', { name: 'users' });

    expect(screen.getByText(/the users namespace/)).toBeInTheDocument();
    expect(screen.getByText('the admin key')).toBeInTheDocument();
  });

  it('updates the namespace description', async () => {
    renderApp(seededApi(), '/namespaces/users');
    await screen.findByRole('heading', { name: 'users' });

    await userEvent.type(screen.getByLabelText('Description (optional)'), 'Accounts.');
    await userEvent.click(screen.getByRole('button', { name: 'Save description' }));

    expect(await screen.findByText(/Accounts\./)).toBeInTheDocument();
  });

  it('clears the namespace description with a blank value', async () => {
    const api = new FakeOkvnsApi();
    api.seed([{ name: 'users', description: 'old docs', entries: [] }]);
    renderApp(api, '/namespaces/users');
    await screen.findByText(/old docs/);

    await userEvent.clear(screen.getByLabelText('Description (optional)'));
    await userEvent.click(screen.getByRole('button', { name: 'Save description' }));

    await waitFor(() => expect(screen.queryByText(/old docs/)).toBeNull());
  });

  it('shows a validation error for an oversized namespace description', async () => {
    renderApp(seededApi(), '/namespaces/users');
    await screen.findByRole('heading', { name: 'users' });

    await userEvent.click(screen.getByLabelText('Description (optional)'));
    await userEvent.paste('x'.repeat(1001));
    await userEvent.click(screen.getByRole('button', { name: 'Save description' }));

    expect(await screen.findByRole('alert')).toBeInTheDocument();
  });

  it('creates a new entry with a description', async () => {
    renderApp(seededApi(), '/namespaces/users');
    await screen.findByRole('heading', { name: 'users' });

    await userEvent.type(screen.getByLabelText('Entry name'), 'token');
    await userEvent.type(screen.getByLabelText('Entry value'), 'abc');
    await userEvent.type(screen.getByLabelText('Entry description (optional)'), 'Service token.');
    await userEvent.click(screen.getByRole('button', { name: 'Add entry' }));

    expect(await screen.findByText('Service token.')).toBeInTheDocument();
    expect(screen.getByLabelText('Entry description (optional)')).toHaveValue('');
  });

  it('updates an entry description while preserving its value', async () => {
    renderApp(seededApi(), '/namespaces/users');
    await screen.findByRole('heading', { name: 'users' });

    const dialog = await openEditor('admin');
    await userEvent.type(dialog.getByLabelText('Description for admin'), 'The admin key.');
    await saveEditor();

    expect(await screen.findByText('The admin key.')).toBeInTheDocument();
    expect(screen.getByText('secret')).toBeInTheDocument();
  });

  it('clears an entry description with a blank value', async () => {
    const api = new FakeOkvnsApi();
    api.seed([
      { name: 'users', entries: [{ name: 'admin', value: 'secret', description: 'docs' }] },
    ]);
    renderApp(api, '/namespaces/users');
    await screen.findByText('docs');

    const dialog = await openEditor('admin');
    await userEvent.clear(dialog.getByLabelText('Description for admin'));
    await saveEditor();

    await waitFor(() => expect(screen.queryByText('docs')).toBeNull());
  });

  it('deletes an entry once the deletion is confirmed', async () => {
    renderApp(seededApi(), '/namespaces/users');
    await screen.findByRole('heading', { name: 'users' });

    await userEvent.click(screen.getByRole('button', { name: 'Delete entry admin' }));
    await confirmDelete();

    await waitFor(() => expect(entryRowAction('Edit', 'admin')).toBeNull());
  });

  it('keeps an entry when the delete confirmation is cancelled', async () => {
    const api = seededApi();
    const deleteEntry = vi.spyOn(api, 'deleteEntry');
    renderApp(api, '/namespaces/users');
    await screen.findByRole('heading', { name: 'users' });

    await userEvent.click(screen.getByRole('button', { name: 'Delete entry admin' }));
    await userEvent.click(
      within(screen.getByRole('alertdialog')).getByRole('button', { name: 'Cancel' }),
    );

    expect(deleteEntry).not.toHaveBeenCalled();
    expect(entryRowAction('Edit', 'admin')).toBeInTheDocument();
  });

  it('creates a new entry marked as environment-dependent', async () => {
    renderApp(seededApi(), '/namespaces/users');
    await screen.findByRole('heading', { name: 'users' });

    await userEvent.type(screen.getByLabelText('Entry name'), 'db-host');
    await userEvent.type(screen.getByLabelText('Entry value'), 'localhost');
    await userEvent.click(screen.getByLabelText('Environment-dependent'));
    await userEvent.click(screen.getByRole('button', { name: 'Add entry' }));

    expect(await screen.findByText('Env-dependent')).toBeInTheDocument();
    // The create form resets so the marker does not leak into the next entry.
    expect(screen.getByLabelText('Environment-dependent')).not.toBeChecked();

    const dialog = await openEditor('db-host');
    expect(dialog.getByLabelText('Environment-dependent for db-host')).toBeChecked();
  });

  it('creates an entry without the marker as not environment-dependent', async () => {
    renderApp(seededApi(), '/namespaces/users');
    await screen.findByRole('heading', { name: 'users' });

    await userEvent.type(screen.getByLabelText('Entry name'), 'token');
    await userEvent.type(screen.getByLabelText('Entry value'), 'abc');
    await userEvent.click(screen.getByRole('button', { name: 'Add entry' }));

    await waitFor(() => expect(entryRowAction('Edit', 'token')).toBeInTheDocument());
    const dialog = await openEditor('token');
    expect(dialog.getByLabelText('Environment-dependent for token')).not.toBeChecked();
  });

  it('displays the stored env_dependent state for entries', async () => {
    const api = new FakeOkvnsApi();
    api.seed([
      {
        name: 'users',
        entries: [
          { name: 'db-host', value: 'localhost', env_dependent: true },
          { name: 'retries', value: '3' },
        ],
      },
    ]);
    renderApp(api, '/namespaces/users');
    await screen.findByRole('heading', { name: 'users' });

    // The flags column tags environment-dependent entries and dashes the rest.
    expect(screen.getByText('Env-dependent')).toBeInTheDocument();
    expect(screen.getByText('—')).toBeInTheDocument();

    expect(
      (await openEditor('db-host')).getByLabelText('Environment-dependent for db-host'),
    ).toBeChecked();
  });

  it('marks an existing entry as environment-dependent while preserving its value', async () => {
    renderApp(seededApi(), '/namespaces/users');
    await screen.findByRole('heading', { name: 'users' });

    const dialog = await openEditor('admin');
    await userEvent.click(dialog.getByLabelText('Environment-dependent for admin'));
    await saveEditor();

    expect(await screen.findByText('Env-dependent')).toBeInTheDocument();
    expect(screen.getByText('secret')).toBeInTheDocument();
  });

  it('clears the environment-dependent marker on an existing entry', async () => {
    const api = new FakeOkvnsApi();
    api.seed([
      { name: 'users', entries: [{ name: 'db-host', value: 'localhost', env_dependent: true }] },
    ]);
    renderApp(api, '/namespaces/users');
    await screen.findByText('Env-dependent');

    const dialog = await openEditor('db-host');
    await userEvent.click(dialog.getByLabelText('Environment-dependent for db-host'));
    await saveEditor();

    await waitFor(() => expect(screen.queryByText('Env-dependent')).toBeNull());
  });

  it('filters the list down to environment-dependent entries', async () => {
    const api = new FakeOkvnsApi();
    api.seed([
      {
        name: 'users',
        entries: [
          { name: 'db-host', value: 'localhost', env_dependent: true },
          { name: 'retries', value: '3' },
        ],
      },
    ]);
    renderApp(api, '/namespaces/users');
    await waitFor(() => expect(entryRowAction('Edit', 'retries')).toBeInTheDocument());

    await userEvent.click(screen.getByLabelText('Show only environment-dependent entries'));

    await waitFor(() => expect(entryRowAction('Edit', 'retries')).toBeNull());
    expect(entryRowAction('Edit', 'db-host')).toBeInTheDocument();

    await userEvent.click(screen.getByLabelText('Show only environment-dependent entries'));
    await waitFor(() => expect(entryRowAction('Edit', 'retries')).toBeInTheDocument());
  });

  it('reports when a namespace has no environment-dependent entries to review', async () => {
    renderApp(seededApi(), '/namespaces/users');
    await waitFor(() => expect(entryRowAction('Edit', 'admin')).toBeInTheDocument());

    await userEvent.click(screen.getByLabelText('Show only environment-dependent entries'));

    expect(await screen.findByText('No environment-dependent entries.')).toBeInTheDocument();
    expect(entryRowAction('Edit', 'admin')).toBeNull();
  });
});

describe('NamespaceDetailPage entry list controls', () => {
  /** Seeds one namespace holding `count` entries named e-001, e-002, … */
  function apiWithEntries(count: number): FakeOkvnsApi {
    const api = new FakeOkvnsApi();
    api.seed([
      {
        name: 'users',
        entries: Array.from({ length: count }, (_, index) => ({
          name: `e-${String(index + 1).padStart(3, '0')}`,
          value: 'v',
        })),
      },
    ]);
    return api;
  }

  it('requests entries from the entry list endpoint rather than the namespace detail', async () => {
    const api = apiWithEntries(1);
    const listEntries = vi.spyOn(api, 'listEntries');
    renderApp(api, '/namespaces/users');
    await screen.findByRole('button', { name: 'Edit entry e-001' });

    expect(listEntries).toHaveBeenCalledWith('users', expect.objectContaining({ page: 1 }));
  });

  it('requests the selected page size from the API', async () => {
    const api = apiWithEntries(12);
    const listEntries = vi.spyOn(api, 'listEntries');
    renderApp(api, '/namespaces/users');
    await screen.findByRole('button', { name: 'Edit entry e-001' });

    expect(entryRowAction('Edit', 'e-011')).toBeNull();

    await userEvent.selectOptions(screen.getByLabelText('Per page'), '50');

    expect(await screen.findByRole('button', { name: 'Edit entry e-011' })).toBeInTheDocument();
    expect(listEntries).toHaveBeenLastCalledWith(
      'users',
      expect.objectContaining({ page_size: 50 }),
    );
  });

  it('shows entry pagination metadata from the API', async () => {
    renderApp(apiWithEntries(12), '/namespaces/users');
    await screen.findByRole('button', { name: 'Edit entry e-001' });

    expect(screen.getByText(/Page 1 of 2 \(12 total\)/)).toBeInTheDocument();
  });

  it('navigates between entry pages', async () => {
    const api = apiWithEntries(12);
    const listEntries = vi.spyOn(api, 'listEntries');
    renderApp(api, '/namespaces/users');
    await screen.findByRole('button', { name: 'Edit entry e-001' });

    await userEvent.click(screen.getByRole('button', { name: 'Next page of entries' }));

    expect(await screen.findByRole('button', { name: 'Edit entry e-011' })).toBeInTheDocument();
    expect(entryRowAction('Edit', 'e-001')).toBeNull();
    expect(listEntries).toHaveBeenLastCalledWith('users', expect.objectContaining({ page: 2 }));
  });

  it('filters entries by name through the API', async () => {
    const api = new FakeOkvnsApi();
    const listEntries = vi.spyOn(api, 'listEntries');
    api.seed([
      {
        name: 'users',
        entries: [
          { name: 'db-host', value: 'localhost' },
          { name: 'retries', value: '3' },
        ],
      },
    ]);
    renderApp(api, '/namespaces/users');
    await screen.findByRole('button', { name: 'Edit entry db-host' });

    await userEvent.type(screen.getByLabelText('Filter by name'), 'db');

    await waitFor(() => expect(entryRowAction('Edit', 'retries')).toBeNull());
    expect(entryRowAction('Edit', 'db-host')).toBeInTheDocument();
    expect(listEntries).toHaveBeenLastCalledWith('users', expect.objectContaining({ name: 'db' }));
  });

  it('reports when an entry filter matches nothing', async () => {
    renderApp(apiWithEntries(1), '/namespaces/users');
    await screen.findByRole('button', { name: 'Edit entry e-001' });

    await userEvent.type(screen.getByLabelText('Filter by name'), 'nope');

    expect(await screen.findByText('No entries match the filter.')).toBeInTheDocument();
  });

  it('requests an env_dependent filter from the API rather than filtering locally', async () => {
    const api = new FakeOkvnsApi();
    const listEntries = vi.spyOn(api, 'listEntries');
    api.seed([
      {
        name: 'users',
        entries: [
          { name: 'db-host', value: 'localhost', env_dependent: true },
          { name: 'retries', value: '3' },
        ],
      },
    ]);
    renderApp(api, '/namespaces/users');
    await screen.findByRole('button', { name: 'Edit entry retries' });

    await userEvent.click(screen.getByLabelText('Show only environment-dependent entries'));

    await waitFor(() =>
      expect(listEntries).toHaveBeenLastCalledWith(
        'users',
        expect.objectContaining({ env_dependent: true }),
      ),
    );

    // Clearing the box drops the filter entirely rather than asking for false.
    await userEvent.click(screen.getByLabelText('Show only environment-dependent entries'));
    await waitFor(() =>
      expect(listEntries).toHaveBeenLastCalledWith(
        'users',
        expect.objectContaining({ env_dependent: undefined }),
      ),
    );
  });

  it('requests the selected entry ordering from the API', async () => {
    const api = new FakeOkvnsApi();
    const listEntries = vi.spyOn(api, 'listEntries');
    api.seed([
      {
        name: 'users',
        entries: [
          { name: 'a-dependent', value: 'v', env_dependent: true },
          { name: 'z-independent', value: 'v' },
        ],
      },
    ]);
    renderApp(api, '/namespaces/users');
    await screen.findByRole('button', { name: 'Edit entry a-dependent' });

    await userEvent.selectOptions(screen.getByLabelText('Order by'), 'env_dependent');

    await waitFor(() =>
      expect(listEntries).toHaveBeenLastCalledWith(
        'users',
        expect.objectContaining({ sort: 'env_dependent' }),
      ),
    );
    // Ascending puts the non-environment-dependent entry first.
    const rows = screen.getAllByRole('button', { name: /^Edit entry/ });
    expect(rows.map((el) => el.getAttribute('aria-label'))).toEqual([
      'Edit entry z-independent',
      'Edit entry a-dependent',
    ]);
  });

  it('steps back a page when deleting the last entry on the current page', async () => {
    renderApp(apiWithEntries(11), '/namespaces/users');
    await screen.findByRole('button', { name: 'Edit entry e-001' });

    await userEvent.click(screen.getByRole('button', { name: 'Next page of entries' }));
    // Page 2 holds exactly one entry; deleting it empties the page.
    await screen.findByRole('button', { name: 'Edit entry e-011' });

    await userEvent.click(screen.getByRole('button', { name: 'Delete entry e-011' }));
    await confirmDelete();

    expect(await screen.findByRole('button', { name: 'Edit entry e-001' })).toBeInTheDocument();
    expect(screen.getByText(/Page 1 of 1 \(10 total\)/)).toBeInTheDocument();
  });

  it('reloads the active entry query after creating an entry', async () => {
    const api = apiWithEntries(1);
    const listEntries = vi.spyOn(api, 'listEntries');
    renderApp(api, '/namespaces/users');
    await screen.findByRole('button', { name: 'Edit entry e-001' });

    await userEvent.selectOptions(screen.getByLabelText('Direction'), 'desc');
    await waitFor(() =>
      expect(listEntries).toHaveBeenLastCalledWith(
        'users',
        expect.objectContaining({ direction: 'desc' }),
      ),
    );

    await userEvent.type(screen.getByLabelText('Entry name'), 'fresh');
    await userEvent.type(screen.getByLabelText('Entry value'), 'v');
    await userEvent.click(screen.getByRole('button', { name: 'Add entry' }));

    expect(await screen.findByRole('button', { name: 'Edit entry fresh' })).toBeInTheDocument();
    // The reload keeps the admin's chosen ordering.
    expect(listEntries).toHaveBeenLastCalledWith(
      'users',
      expect.objectContaining({ direction: 'desc' }),
    );
  });
});
