import { describe, expect, it, vi } from 'vitest';
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
    await screen.findByRole('heading', { name: 'Namespace: users' });

    expect(screen.getByText('2024-01-02T00:00:00.000Z')).toBeInTheDocument();
    expect(screen.getByText('2024-01-03T00:00:00.000Z')).toBeInTheDocument();
    expect(screen.getByText('2024-02-02T00:00:00.000Z')).toBeInTheDocument();
    expect(screen.getByText('2024-02-03T00:00:00.000Z')).toBeInTheDocument();
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
    await screen.findByRole('heading', { name: 'Namespace: users' });

    // Descriptions render both as displayed text and inside their edit control,
    // so display assertions target the paragraph specifically.
    expect(screen.getByText('the users namespace', { selector: 'p' })).toBeInTheDocument();
    expect(screen.getByText('the admin key', { selector: 'p' })).toBeInTheDocument();
  });

  it('updates the namespace description', async () => {
    renderApp(seededApi(), '/namespaces/users');
    await screen.findByRole('heading', { name: 'Namespace: users' });

    await userEvent.type(screen.getByLabelText('Description (optional)'), 'Accounts.');
    await userEvent.click(screen.getByRole('button', { name: 'Save description' }));

    expect(await screen.findByText('Accounts.', { selector: 'p' })).toBeInTheDocument();
  });

  it('clears the namespace description with a blank value', async () => {
    const api = new FakeOkvnsApi();
    api.seed([{ name: 'users', description: 'old docs', entries: [] }]);
    renderApp(api, '/namespaces/users');
    await screen.findByText('old docs', { selector: 'p' });

    await userEvent.clear(screen.getByLabelText('Description (optional)'));
    await userEvent.click(screen.getByRole('button', { name: 'Save description' }));

    await waitFor(() => expect(screen.queryByText('old docs', { selector: 'p' })).toBeNull());
  });

  it('shows a validation error for an oversized namespace description', async () => {
    renderApp(seededApi(), '/namespaces/users');
    await screen.findByRole('heading', { name: 'Namespace: users' });

    await userEvent.click(screen.getByLabelText('Description (optional)'));
    await userEvent.paste('x'.repeat(1001));
    await userEvent.click(screen.getByRole('button', { name: 'Save description' }));

    expect(await screen.findByRole('alert')).toBeInTheDocument();
  });

  it('creates a new entry with a description', async () => {
    renderApp(seededApi(), '/namespaces/users');
    await screen.findByRole('heading', { name: 'Namespace: users' });

    await userEvent.type(screen.getByLabelText('Entry name'), 'token');
    await userEvent.type(screen.getByLabelText('Entry value'), 'abc');
    await userEvent.type(screen.getByLabelText('Entry description (optional)'), 'Service token.');
    await userEvent.click(screen.getByRole('button', { name: 'Add entry' }));

    expect(await screen.findByText('Service token.', { selector: 'p' })).toBeInTheDocument();
    expect(screen.getByLabelText('Entry description (optional)')).toHaveValue('');
  });

  it('updates an entry description while preserving its value', async () => {
    renderApp(seededApi(), '/namespaces/users');
    const descriptionInput = await screen.findByLabelText('Description for admin');
    await userEvent.type(descriptionInput, 'The admin key.');
    await userEvent.click(screen.getByRole('button', { name: 'Save' }));

    expect(await screen.findByText('The admin key.', { selector: 'p' })).toBeInTheDocument();
    expect(screen.getByLabelText('Value for admin')).toHaveValue('secret');
  });

  it('clears an entry description with a blank value', async () => {
    const api = new FakeOkvnsApi();
    api.seed([
      { name: 'users', entries: [{ name: 'admin', value: 'secret', description: 'docs' }] },
    ]);
    renderApp(api, '/namespaces/users');
    await screen.findByText('docs', { selector: 'p' });

    await userEvent.clear(screen.getByLabelText('Description for admin'));
    await userEvent.click(screen.getByRole('button', { name: 'Save' }));

    await waitFor(() => expect(screen.queryByText('docs', { selector: 'p' })).toBeNull());
  });

  it('deletes an entry', async () => {
    renderApp(seededApi(), '/namespaces/users');
    await screen.findByLabelText('Value for admin');
    await userEvent.click(screen.getByRole('button', { name: 'Delete entry admin' }));
    await waitFor(() => expect(screen.queryByLabelText('Value for admin')).toBeNull());
  });

  it('creates a new entry marked as environment-dependent', async () => {
    renderApp(seededApi(), '/namespaces/users');
    await screen.findByRole('heading', { name: 'Namespace: users' });

    await userEvent.type(screen.getByLabelText('Entry name'), 'db-host');
    await userEvent.type(screen.getByLabelText('Entry value'), 'localhost');
    await userEvent.click(screen.getByLabelText('Environment-dependent'));
    await userEvent.click(screen.getByRole('button', { name: 'Add entry' }));

    expect(await screen.findByLabelText('Environment-dependent for db-host')).toBeChecked();
    // The create form resets so the marker does not leak into the next entry.
    expect(screen.getByLabelText('Environment-dependent')).not.toBeChecked();
  });

  it('creates an entry without the marker as not environment-dependent', async () => {
    renderApp(seededApi(), '/namespaces/users');
    await screen.findByRole('heading', { name: 'Namespace: users' });

    await userEvent.type(screen.getByLabelText('Entry name'), 'token');
    await userEvent.type(screen.getByLabelText('Entry value'), 'abc');
    await userEvent.click(screen.getByRole('button', { name: 'Add entry' }));

    expect(await screen.findByLabelText('Environment-dependent for token')).not.toBeChecked();
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
    await screen.findByRole('heading', { name: 'Namespace: users' });

    expect(screen.getByLabelText('Environment-dependent for db-host')).toBeChecked();
    expect(screen.getByLabelText('Environment-dependent for retries')).not.toBeChecked();
    expect(screen.getByText('Environment-dependent', { selector: 'p' })).toBeInTheDocument();
  });

  it('marks an existing entry as environment-dependent while preserving its value', async () => {
    renderApp(seededApi(), '/namespaces/users');
    await screen.findByLabelText('Value for admin');

    await userEvent.click(screen.getByLabelText('Environment-dependent for admin'));
    await userEvent.click(screen.getByRole('button', { name: 'Save' }));

    expect(await screen.findByText('Environment-dependent', { selector: 'p' })).toBeInTheDocument();
    expect(screen.getByLabelText('Value for admin')).toHaveValue('secret');
  });

  it('clears the environment-dependent marker on an existing entry', async () => {
    const api = new FakeOkvnsApi();
    api.seed([
      { name: 'users', entries: [{ name: 'db-host', value: 'localhost', env_dependent: true }] },
    ]);
    renderApp(api, '/namespaces/users');
    await screen.findByText('Environment-dependent', { selector: 'p' });

    await userEvent.click(screen.getByLabelText('Environment-dependent for db-host'));
    await userEvent.click(screen.getByRole('button', { name: 'Save' }));

    await waitFor(() =>
      expect(screen.queryByText('Environment-dependent', { selector: 'p' })).toBeNull(),
    );
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
    await screen.findByLabelText('Value for retries');

    await userEvent.click(screen.getByLabelText('Show only environment-dependent entries'));

    expect(screen.getByLabelText('Value for db-host')).toBeInTheDocument();
    expect(screen.queryByLabelText('Value for retries')).toBeNull();

    await userEvent.click(screen.getByLabelText('Show only environment-dependent entries'));
    expect(screen.getByLabelText('Value for retries')).toBeInTheDocument();
  });

  it('reports when a namespace has no environment-dependent entries to review', async () => {
    renderApp(seededApi(), '/namespaces/users');
    await screen.findByLabelText('Value for admin');

    await userEvent.click(screen.getByLabelText('Show only environment-dependent entries'));

    expect(screen.getByText('No environment-dependent entries.')).toBeInTheDocument();
    expect(screen.queryByLabelText('Value for admin')).toBeNull();
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
    await screen.findByLabelText('Value for e-001');

    expect(listEntries).toHaveBeenCalledWith('users', expect.objectContaining({ page: 1 }));
  });

  it('requests the selected page size from the API', async () => {
    const api = apiWithEntries(12);
    const listEntries = vi.spyOn(api, 'listEntries');
    renderApp(api, '/namespaces/users');
    await screen.findByLabelText('Value for e-001');

    expect(screen.queryByLabelText('Value for e-011')).toBeNull();

    await userEvent.selectOptions(screen.getByLabelText('Per page'), '50');

    expect(await screen.findByLabelText('Value for e-011')).toBeInTheDocument();
    expect(listEntries).toHaveBeenLastCalledWith(
      'users',
      expect.objectContaining({ page_size: 50 }),
    );
  });

  it('shows entry pagination metadata from the API', async () => {
    renderApp(apiWithEntries(12), '/namespaces/users');
    await screen.findByLabelText('Value for e-001');

    expect(screen.getByText(/Page 1 of 2 \(12 total\)/)).toBeInTheDocument();
  });

  it('navigates between entry pages', async () => {
    const api = apiWithEntries(12);
    const listEntries = vi.spyOn(api, 'listEntries');
    renderApp(api, '/namespaces/users');
    await screen.findByLabelText('Value for e-001');

    await userEvent.click(screen.getByRole('button', { name: 'Next page of entries' }));

    expect(await screen.findByLabelText('Value for e-011')).toBeInTheDocument();
    expect(screen.queryByLabelText('Value for e-001')).toBeNull();
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
    await screen.findByLabelText('Value for db-host');

    await userEvent.type(screen.getByLabelText('Filter by name'), 'db');

    await waitFor(() => expect(screen.queryByLabelText('Value for retries')).toBeNull());
    expect(screen.getByLabelText('Value for db-host')).toBeInTheDocument();
    expect(listEntries).toHaveBeenLastCalledWith('users', expect.objectContaining({ name: 'db' }));
  });

  it('reports when an entry filter matches nothing', async () => {
    renderApp(apiWithEntries(1), '/namespaces/users');
    await screen.findByLabelText('Value for e-001');

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
    await screen.findByLabelText('Value for retries');

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
    await screen.findByLabelText('Value for a-dependent');

    await userEvent.selectOptions(screen.getByLabelText('Order by'), 'env_dependent');

    await waitFor(() =>
      expect(listEntries).toHaveBeenLastCalledWith(
        'users',
        expect.objectContaining({ sort: 'env_dependent' }),
      ),
    );
    // Ascending puts the non-environment-dependent entry first.
    const values = screen.getAllByRole('textbox', { name: /^Value for/ });
    expect(values.map((el) => el.getAttribute('aria-label'))).toEqual([
      'Value for z-independent',
      'Value for a-dependent',
    ]);
  });

  it('steps back a page when deleting the last entry on the current page', async () => {
    renderApp(apiWithEntries(11), '/namespaces/users');
    await screen.findByLabelText('Value for e-001');

    await userEvent.click(screen.getByRole('button', { name: 'Next page of entries' }));
    // Page 2 holds exactly one entry; deleting it empties the page.
    await screen.findByLabelText('Value for e-011');

    await userEvent.click(screen.getByRole('button', { name: 'Delete entry e-011' }));

    expect(await screen.findByLabelText('Value for e-001')).toBeInTheDocument();
    expect(screen.getByText(/Page 1 of 1 \(10 total\)/)).toBeInTheDocument();
  });

  it('reloads the active entry query after creating an entry', async () => {
    const api = apiWithEntries(1);
    const listEntries = vi.spyOn(api, 'listEntries');
    renderApp(api, '/namespaces/users');
    await screen.findByLabelText('Value for e-001');

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

    expect(await screen.findByLabelText('Value for fresh')).toBeInTheDocument();
    // The reload keeps the admin's chosen ordering.
    expect(listEntries).toHaveBeenLastCalledWith(
      'users',
      expect.objectContaining({ direction: 'desc' }),
    );
  });
});
