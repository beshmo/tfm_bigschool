import { screen, waitFor, within } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { App } from '../App';
import { ApiError } from '../api/api-error';
import { FakeApi } from '../test/fake-api';
import { renderWithProviders, toast } from '../test/render';

function apiWithEntries(entries: Parameters<FakeApi['seed']>[1] = [], extra = {}) {
  return new FakeApi().seed('billing', entries, { description: 'Billing settings', ...extra });
}

async function openDetail(api: FakeApi, name = 'billing') {
  const view = renderWithProviders(<App />, { api, route: `/namespaces/${name}` });
  await screen.findByRole('heading', { name });
  return view;
}

describe('NamespaceDetailPage view', () => {
  it('GIVEN a namespace WHEN opened THEN its name, description, timestamps and sections show', async () => {
    await openDetail(apiWithEntries());

    expect(screen.getByRole('heading', { name: 'billing', level: 1 })).toBeInTheDocument();
    expect(document.querySelector('p.sub')).toHaveTextContent('Billing settings');
    expect(screen.getByRole('heading', { name: 'Namespace settings' })).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: 'Add entry' })).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: 'Entries' })).toBeInTheDocument();
    expect(screen.getByLabelText('Description (optional)', { exact: true })).toHaveValue(
      'Billing settings',
    );
    expect(document.querySelectorAll('.page-head time[datetime]')).toHaveLength(2);
  });

  it('GIVEN a namespace without a description WHEN opened THEN the subheading says so', async () => {
    await openDetail(new FakeApi().seed('billing'));

    expect(document.querySelector('p.sub')).toHaveTextContent('No description.');
  });

  it('GIVEN a missing namespace WHEN opened THEN an error banner and a way back are shown', async () => {
    renderWithProviders(<App />, { api: new FakeApi(), route: '/namespaces/ghost' });

    expect(await screen.findByRole('alert')).toHaveTextContent('Namespace "ghost" was not found.');
    expect(screen.getAllByRole('link', { name: 'Namespaces' }).length).toBeGreaterThan(0);
  });

  it('GIVEN entries WHEN listed THEN value, description, environment marker and timestamps render', async () => {
    await openDetail(
      apiWithEntries([
        { name: 'admin', value: 'secret', description: 'the admin key' },
        { name: 'db-host', value: 'db.prod', env_dependent: true },
      ]),
    );

    expect(await screen.findByRole('cell', { name: 'secret' })).toBeInTheDocument();
    expect(screen.getByRole('cell', { name: 'the admin key' })).toBeInTheDocument();
    expect(screen.getByText('Needs adjustment per environment')).toBeInTheDocument();
    expect(screen.getByText('Page 1 of 1 (2 total)')).toBeInTheDocument();
    expect(screen.getAllByRole('columnheader').map((header) => header.textContent)).toEqual([
      'Name',
      'Value',
      'Description',
      'Environment',
      'Created',
      'Modified',
      '',
    ]);
  });

  it('GIVEN no entries WHEN opened THEN empty states distinguish "none yet" from "no match"', async () => {
    const { user } = await openDetail(apiWithEntries());

    expect(await screen.findByText('No entries yet.')).toBeInTheDocument();
    expect(screen.getByText('Add one above to get started.')).toBeInTheDocument();

    await user.type(screen.getByLabelText('Filter by name'), 'zzz');
    expect(await screen.findByText('No entries match the filter.')).toBeInTheDocument();
  });
});

describe('NamespaceDetailPage settings', () => {
  it('GIVEN a new description WHEN saved THEN the API is called and the subheading reflects it', async () => {
    const api = apiWithEntries();
    const { user } = await openDetail(api);

    const field = screen.getByLabelText('Description (optional)', { exact: true });
    await user.clear(field);
    await user.type(field, 'updated by test');
    await user.click(screen.getByRole('button', { name: 'Save description' }));

    await waitFor(() =>
      expect(document.querySelector('p.sub')).toHaveTextContent('updated by test'),
    );
    expect(api.callsTo('updateNamespace')[0]!.args).toEqual([
      'billing',
      { description: 'updated by test' },
    ]);
    expect(toast()).toHaveTextContent('Changes saved');
  });

  it('GIVEN a blank description WHEN saved THEN the description is cleared', async () => {
    const api = apiWithEntries();
    const { user } = await openDetail(api);

    await user.clear(screen.getByLabelText('Description (optional)', { exact: true }));
    await user.click(screen.getByRole('button', { name: 'Save description' }));

    await waitFor(() =>
      expect(document.querySelector('p.sub')).toHaveTextContent('No description.'),
    );
    expect(api.callsTo('updateNamespace')[0]!.args[1]).toEqual({ description: '' });
  });

  it('GIVEN a new name WHEN renamed THEN the page follows to the new name and keeps the description', async () => {
    const api = apiWithEntries([{ name: 'k', value: 'v' }]);
    const { user } = await openDetail(api);

    await user.type(screen.getByLabelText('New name'), 'payments');
    await user.click(screen.getByRole('button', { name: 'Rename' }));

    expect(await screen.findByRole('heading', { name: 'payments' })).toBeInTheDocument();
    expect(document.querySelector('p.sub')).toHaveTextContent('Billing settings');
    expect(api.callsTo('updateNamespace')[0]!.args).toEqual(['billing', { name: 'payments' }]);
    expect(await screen.findByRole('cell', { name: 'v' })).toBeInTheDocument();
  });

  it('GIVEN a taken name WHEN renamed THEN the error shows and the page stays', async () => {
    const api = apiWithEntries().seed('payments');
    const { user } = await openDetail(api);

    await user.type(screen.getByLabelText('New name'), 'payments');
    await user.click(screen.getByRole('button', { name: 'Rename' }));

    expect(await screen.findByRole('alert')).toHaveTextContent('already exists');
    expect(screen.getByRole('heading', { name: 'billing' })).toBeInTheDocument();
  });

  it('GIVEN a failing description save WHEN submitted THEN a banner appears', async () => {
    const api = apiWithEntries();
    api.failNext(
      'updateNamespace',
      new ApiError(400, 'VALIDATION_ERROR', 'Request validation failed.', ['description too long']),
    );
    const { user } = await openDetail(api);

    await user.click(screen.getByRole('button', { name: 'Save description' }));

    expect(await screen.findByRole('alert')).toHaveTextContent('description too long');
  });

  it('GIVEN the namespace WHEN deleted from its page THEN it confirms, deletes and returns to the list', async () => {
    const api = apiWithEntries();
    const { user } = await openDetail(api);

    await user.click(screen.getByRole('button', { name: 'Delete namespace billing' }));
    await user.click(
      within(screen.getByRole('alertdialog', { name: 'Delete namespace?' })).getByRole('button', {
        name: 'Delete',
      }),
    );

    expect(await screen.findByRole('heading', { name: 'Namespaces' })).toBeInTheDocument();
    expect(api.callsTo('deleteNamespace')[0]!.args).toEqual(['billing']);
    expect(toast()).toHaveTextContent('Namespace deleted');
  });
});

describe('NamespaceDetailPage entries', () => {
  it('GIVEN the add form WHEN submitted THEN the entry is created with description and marker, and the form resets', async () => {
    const api = apiWithEntries();
    const { user } = await openDetail(api);

    await user.type(screen.getByLabelText('Entry name'), 'db-host');
    await user.type(screen.getByLabelText('Entry value'), 'db.internal');
    await user.type(screen.getByLabelText('Entry description (optional)'), 'the host');
    await user.click(screen.getByLabelText('Environment-dependent', { exact: true }));
    await user.click(screen.getByRole('button', { name: 'Add entry' }));

    expect(await screen.findByRole('cell', { name: 'db.internal' })).toBeInTheDocument();
    expect(screen.getByRole('cell', { name: 'the host' })).toBeInTheDocument();
    expect(screen.getByText('Needs adjustment per environment')).toBeInTheDocument();
    expect(api.callsTo('createEntry')[0]!.args).toEqual([
      'billing',
      { name: 'db-host', value: 'db.internal', description: 'the host', env_dependent: true },
    ]);
    expect(toast()).toHaveTextContent('Entry added');
    expect(screen.getByLabelText('Entry name')).toHaveValue('');
    expect(screen.getByLabelText('Entry value')).toHaveValue('');
    expect(screen.getByLabelText('Environment-dependent', { exact: true })).not.toBeChecked();
  });

  it('GIVEN no description or marker WHEN added THEN the defaults are sent', async () => {
    const api = apiWithEntries();
    const { user } = await openDetail(api);

    await user.type(screen.getByLabelText('Entry name'), 'k');
    await user.type(screen.getByLabelText('Entry value'), 'v');
    await user.click(screen.getByRole('button', { name: 'Add entry' }));

    await screen.findByRole('cell', { name: 'v' });
    expect(api.callsTo('createEntry')[0]!.args[1]).toEqual({
      name: 'k',
      value: 'v',
      description: undefined,
      env_dependent: false,
    });
  });

  it('GIVEN an existing name WHEN added THEN the duplicate error shows beside the form', async () => {
    const { user } = await openDetail(apiWithEntries([{ name: 'k', value: 'v' }]));

    await user.type(screen.getByLabelText('Entry name'), 'k');
    await user.type(screen.getByLabelText('Entry value'), 'x');
    await user.click(screen.getByRole('button', { name: 'Add entry' }));

    const form = screen.getByRole('form', { name: 'Add entry' });
    expect(await within(form).findByRole('alert')).toHaveTextContent('Entry "k" already exists.');
    expect(screen.getByLabelText('Entry value')).toHaveValue('x');
  });

  it('GIVEN an entry WHEN edited THEN the dialog saves changed fields and the table updates', async () => {
    const api = apiWithEntries([{ name: 'admin', value: 'old', description: 'doc' }]);
    const { user } = await openDetail(api);

    await user.click(await screen.findByRole('button', { name: 'Edit entry admin' }));
    const dialog = screen.getByRole('dialog', { name: 'Edit entry admin' });
    expect(within(dialog).getByLabelText('Value for admin')).toHaveValue('old');
    expect(within(dialog).getByLabelText('Description for admin')).toHaveValue('doc');
    const value = within(dialog).getByLabelText('Value for admin');
    await user.clear(value);
    await user.type(value, 'rotated');
    await user.click(within(dialog).getByRole('button', { name: 'Save' }));

    expect(await screen.findByRole('cell', { name: 'rotated' })).toBeInTheDocument();
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    expect(api.callsTo('updateEntry')[0]!.args).toEqual([
      'billing',
      'admin',
      { value: 'rotated', description: 'doc', env_dependent: false },
    ]);
    expect(toast()).toHaveTextContent('Changes saved');
    expect(screen.getByRole('button', { name: 'Edit entry admin' })).toHaveFocus();
  });

  it('GIVEN an edit that renames and flags the entry WHEN saved THEN the name and marker are sent', async () => {
    const api = apiWithEntries([{ name: 'old', value: 'v' }]);
    const { user } = await openDetail(api);

    await user.click(await screen.findByRole('button', { name: 'Edit entry old' }));
    const dialog = screen.getByRole('dialog');
    const name = within(dialog).getByLabelText('Name for old');
    await user.clear(name);
    await user.type(name, 'new');
    await user.click(within(dialog).getByLabelText('Environment-dependent for old'));
    await user.clear(within(dialog).getByLabelText('Description for old'));
    await user.click(within(dialog).getByRole('button', { name: 'Save' }));

    expect(await screen.findByRole('button', { name: 'Edit entry new' })).toBeInTheDocument();
    expect(api.callsTo('updateEntry')[0]!.args[2]).toEqual({
      name: 'new',
      value: 'v',
      description: '',
      env_dependent: true,
    });
  });

  it('GIVEN a failing save WHEN submitted THEN the error appears inside the dialog and it stays open', async () => {
    const api = apiWithEntries([{ name: 'admin', value: 'v' }]);
    api.failNext('updateEntry', new ApiError(409, 'DUPLICATE_ENTRY', 'Entry "x" already exists.'));
    const { user } = await openDetail(api);

    await user.click(await screen.findByRole('button', { name: 'Edit entry admin' }));
    const dialog = screen.getByRole('dialog');
    await user.click(within(dialog).getByRole('button', { name: 'Save' }));

    expect(await within(dialog).findByRole('alert')).toHaveTextContent('already exists');
    expect(screen.getByRole('dialog')).toBeInTheDocument();
    expect(within(dialog).getByRole('button', { name: 'Save' })).toBeEnabled();
  });

  it('GIVEN the edit dialog WHEN cancelled THEN nothing is saved', async () => {
    const api = apiWithEntries([{ name: 'admin', value: 'v' }]);
    const { user } = await openDetail(api);

    await user.click(await screen.findByRole('button', { name: 'Edit entry admin' }));
    await user.click(within(screen.getByRole('dialog')).getByRole('button', { name: 'Cancel' }));

    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    expect(api.callsTo('updateEntry')).toHaveLength(0);
  });

  it('GIVEN an entry WHEN deleted THEN a confirmation gates it and the row disappears', async () => {
    const api = apiWithEntries([
      { name: 'admin', value: 'secret' },
      { name: 'zed', value: 'z' },
    ]);
    const { user } = await openDetail(api);

    await user.click(await screen.findByRole('button', { name: 'Delete entry admin' }));
    const dialog = screen.getByRole('alertdialog', { name: 'Delete entry?' });
    expect(dialog).toHaveTextContent('admin');
    await user.click(within(dialog).getByRole('button', { name: 'Delete' }));

    await waitFor(() =>
      expect(screen.queryByRole('button', { name: 'Edit entry admin' })).not.toBeInTheDocument(),
    );
    expect(api.callsTo('deleteEntry')[0]!.args).toEqual(['billing', 'admin']);
    expect(toast()).toHaveTextContent('Entry deleted');
    expect(screen.getByRole('button', { name: 'Edit entry zed' })).toBeInTheDocument();
  });

  it('GIVEN the last entry of page 2 WHEN deleted THEN the list goes back to page 1', async () => {
    const entries = Array.from({ length: 11 }, (_, index) => ({
      name: `e${String(index).padStart(2, '0')}`,
      value: 'v',
    }));
    const { user } = await openDetail(apiWithEntries(entries));
    await screen.findByText('Page 1 of 2 (11 total)');
    await user.click(screen.getByRole('button', { name: 'Next page' }));
    await screen.findByRole('button', { name: 'Edit entry e10' });

    await user.click(screen.getByRole('button', { name: 'Delete entry e10' }));
    await user.click(
      within(screen.getByRole('alertdialog')).getByRole('button', { name: 'Delete' }),
    );

    expect(await screen.findByText('Page 1 of 1 (10 total)')).toBeInTheDocument();
  });

  it('GIVEN a failing entry delete WHEN confirmed THEN a banner explains it', async () => {
    const api = apiWithEntries([{ name: 'admin', value: 'v' }]);
    api.failNext(
      'deleteEntry',
      new ApiError(404, 'ENTRY_NOT_FOUND', 'Entry "admin" was not found in the namespace.'),
    );
    const { user } = await openDetail(api);

    await user.click(await screen.findByRole('button', { name: 'Delete entry admin' }));
    await user.click(
      within(screen.getByRole('alertdialog')).getByRole('button', { name: 'Delete' }),
    );

    expect(await screen.findByRole('alert')).toHaveTextContent('was not found');
  });
});

describe('NamespaceDetailPage entry list controls', () => {
  const entries = [
    { name: 'db-host', value: 'h', env_dependent: true },
    { name: 'db-port', value: 'p' },
    { name: 'retries', value: 'r', env_dependent: true },
  ];

  it('GIVEN the controls WHEN opened THEN entries also offer Environment-dependent ordering', async () => {
    await openDetail(apiWithEntries(entries));

    expect(
      within(screen.getByLabelText('Order by'))
        .getAllByRole('option')
        .map((option) => option.textContent),
    ).toEqual(['Name', 'Created', 'Modified', 'Environment-dependent']);
  });

  it('GIVEN the environment filter WHEN checked THEN the API is asked for env_dependent=true entries', async () => {
    const api = apiWithEntries(entries);
    const { user } = await openDetail(api);
    await screen.findByRole('button', { name: 'Edit entry db-port' });

    await user.click(screen.getByLabelText('Show only environment-dependent entries'));

    await waitFor(() =>
      expect(screen.queryByRole('button', { name: 'Edit entry db-port' })).not.toBeInTheDocument(),
    );
    expect(screen.getByRole('button', { name: 'Edit entry db-host' })).toBeInTheDocument();
    expect(screen.getByText('Page 1 of 1 (2 total)')).toBeInTheDocument();
    expect(api.callsTo('listEntries').at(-1)!.args[1]).toMatchObject({ envDependent: true });

    await user.click(screen.getByLabelText('Show only environment-dependent entries'));
    expect(await screen.findByRole('button', { name: 'Edit entry db-port' })).toBeInTheDocument();
    expect(api.callsTo('listEntries').at(-1)!.args[1]).toMatchObject({ envDependent: undefined });
  });

  it('GIVEN filter, ordering and page size WHEN changed THEN each re-requests entries from the API', async () => {
    const api = apiWithEntries(entries);
    const { user } = await openDetail(api);
    await screen.findByRole('button', { name: 'Edit entry db-port' });

    await user.type(screen.getByLabelText('Filter by name'), 'db');
    await user.selectOptions(screen.getByLabelText('Order by'), 'env_dependent');
    await user.selectOptions(screen.getByLabelText('Direction'), 'desc');
    await user.selectOptions(screen.getByLabelText('Per page'), '100');

    await waitFor(() =>
      expect(api.callsTo('listEntries').at(-1)!.args[1]).toEqual({
        page: 1,
        pageSize: 100,
        sort: 'env_dependent',
        direction: 'desc',
        name: 'db',
        envDependent: undefined,
      }),
    );
    expect(screen.getByText('Page 1 of 1 (2 total)')).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Edit entry retries' })).not.toBeInTheDocument();
  });

  it('GIVEN a failing entry list WHEN loaded THEN a banner is shown', async () => {
    const api = apiWithEntries(entries);
    api.failNext(
      'listEntries',
      new ApiError(500, 'INTERNAL_ERROR', 'An unexpected error occurred.'),
    );

    renderWithProviders(<App />, { api, route: '/namespaces/billing' });

    expect(await screen.findByRole('alert')).toHaveTextContent('An unexpected error occurred.');
  });
});
