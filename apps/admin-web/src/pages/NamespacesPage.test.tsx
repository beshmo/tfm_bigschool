import { screen, waitFor, within } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { App } from '../App';
import { ApiError } from '../api/api-error';
import { FakeApi } from '../test/fake-api';
import { renderWithProviders, toast } from '../test/render';

function seeded(count: number, prefix = 'ns') {
  const api = new FakeApi();
  for (let index = 0; index < count; index++) {
    api.seed(
      `${prefix}-${String(index).padStart(2, '0')}`,
      [],
      index === 0 ? { description: 'the first one' } : {},
    );
  }
  return api;
}

const rowNames = () =>
  screen
    .queryAllByRole('link')
    .map((link) => link.textContent)
    .filter((text) => text?.startsWith('ns-'));

describe('NamespacesPage list', () => {
  it('GIVEN namespaces WHEN the page loads THEN a Loading status and skeleton give way to the table', async () => {
    renderWithProviders(<App />, { api: seeded(2) });

    expect(screen.getByRole('status')).toHaveTextContent('Loading…');
    expect(document.querySelectorAll('.skeleton-row')).toHaveLength(4);

    expect(await screen.findByRole('link', { name: 'ns-00' })).toHaveAttribute(
      'href',
      '/namespaces/ns-00',
    );
    expect(screen.queryByText('Loading…')).not.toBeInTheDocument();
    expect(screen.getByRole('heading', { name: 'Namespaces' })).toBeInTheDocument();
    expect(screen.getByRole('cell', { name: 'the first one' })).toBeInTheDocument();
    expect(screen.getByText('Page 1 of 1 (2 total)')).toBeInTheDocument();
    expect(screen.getAllByRole('columnheader').map((header) => header.textContent)).toEqual([
      'Name',
      'Description',
      'Created',
      'Modified',
      '',
    ]);
    expect(document.querySelectorAll('time[datetime]').length).toBeGreaterThanOrEqual(4);
  });

  it('GIVEN the first load WHEN requested THEN it asks for page 1, size 10, name ascending', async () => {
    const { api } = renderWithProviders(<App />, { api: seeded(1) });

    await screen.findByRole('link', { name: 'ns-00' });

    expect(api.callsTo('listNamespaces')[0]!.args[0]).toEqual({
      page: 1,
      pageSize: 10,
      sort: 'name',
      direction: 'asc',
      name: undefined,
    });
  });

  it('GIVEN no namespaces WHEN loaded THEN an empty state invites creating one', async () => {
    renderWithProviders(<App />, { api: new FakeApi() });

    expect(await screen.findByText('No namespaces yet.')).toBeInTheDocument();
    expect(screen.getByText('Create one above to get started.')).toBeInTheDocument();
  });

  it('GIVEN an active filter WHEN nothing matches THEN the empty state says so', async () => {
    const { user } = renderWithProviders(<App />, { api: seeded(2) });
    await screen.findByRole('link', { name: 'ns-00' });

    await user.type(screen.getByLabelText('Filter by name'), 'zzz');

    expect(await screen.findByText('No namespaces match the filter.')).toBeInTheDocument();
    expect(screen.queryByText('No namespaces yet.')).not.toBeInTheDocument();
  });

  it('GIVEN a failing list WHEN loaded THEN an error banner is shown', async () => {
    const api = new FakeApi();
    api.failNext(
      'listNamespaces',
      new ApiError(500, 'INTERNAL_ERROR', 'An unexpected error occurred.'),
    );

    renderWithProviders(<App />, { api });

    expect(await screen.findByRole('alert')).toHaveTextContent('An unexpected error occurred.');
  });
});

describe('NamespacesPage list controls', () => {
  it('GIVEN the controls WHEN changed THEN each change immediately re-requests the API', async () => {
    const { api, user } = renderWithProviders(<App />, { api: seeded(3) });
    await screen.findByRole('link', { name: 'ns-00' });

    await user.type(screen.getByLabelText('Filter by name'), 'ns');
    await user.selectOptions(screen.getByLabelText('Order by'), 'modified_at');
    await user.selectOptions(screen.getByLabelText('Direction'), 'desc');
    await user.selectOptions(screen.getByLabelText('Per page'), '50');

    await waitFor(() => expect(rowNames()).toEqual(['ns-02', 'ns-01', 'ns-00']));
    const last = api.callsTo('listNamespaces').at(-1)!.args[0];
    expect(last).toEqual({
      page: 1,
      pageSize: 50,
      sort: 'modified_at',
      direction: 'desc',
      name: 'ns',
    });
    expect(api.callsTo('listNamespaces').length).toBeGreaterThanOrEqual(5);
    expect(screen.getAllByRole('option').map((option) => option.textContent)).toEqual([
      'Name',
      'Created',
      'Modified',
      'Ascending',
      'Descending',
      '10',
      '50',
      '100',
    ]);
  });

  it('GIVEN many namespaces WHEN paging THEN the API metadata drives the controls', async () => {
    const { api, user } = renderWithProviders(<App />, { api: seeded(12) });
    expect(await screen.findByText('Page 1 of 2 (12 total)')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Previous page' })).toBeDisabled();

    await user.click(screen.getByRole('button', { name: 'Next page' }));

    expect(await screen.findByText('Page 2 of 2 (12 total)')).toBeInTheDocument();
    expect(rowNames()).toEqual(['ns-10', 'ns-11']);
    expect(api.callsTo('listNamespaces').at(-1)!.args[0]).toMatchObject({ page: 2 });
    expect(screen.getByRole('button', { name: 'Next page' })).toBeDisabled();
  });

  it('GIVEN page 2 WHEN a control changes THEN it returns to page 1', async () => {
    const { user } = renderWithProviders(<App />, { api: seeded(12) });
    await screen.findByText('Page 1 of 2 (12 total)');
    await user.click(screen.getByRole('button', { name: 'Next page' }));
    await screen.findByText('Page 2 of 2 (12 total)');

    await user.selectOptions(screen.getByLabelText('Direction'), 'desc');

    expect(await screen.findByText('Page 1 of 2 (12 total)')).toBeInTheDocument();
  });
});

describe('NamespacesPage create', () => {
  it('GIVEN a name and description WHEN created THEN the API is called, a toast confirms and the form clears', async () => {
    const { api, user } = renderWithProviders(<App />, { api: new FakeApi() });
    await screen.findByText('No namespaces yet.');

    await user.type(screen.getByLabelText('Namespace name'), 'billing');
    await user.type(screen.getByLabelText('Description (optional)'), 'Billing settings');
    await user.click(screen.getByRole('button', { name: 'Create namespace' }));

    expect(await screen.findByRole('link', { name: 'billing' })).toBeInTheDocument();
    expect(screen.getByRole('cell', { name: 'Billing settings' })).toBeInTheDocument();
    expect(api.callsTo('createNamespace')[0]!.args[0]).toEqual({
      name: 'billing',
      description: 'Billing settings',
    });
    expect(
      within(screen.getByRole('region', { name: 'Notifications' })).getByRole('status'),
    ).toHaveTextContent('Namespace created');
    expect(screen.getByLabelText('Namespace name')).toHaveValue('');
    expect(screen.getByLabelText('Description (optional)')).toHaveValue('');
  });

  it('GIVEN no description WHEN created THEN none is sent', async () => {
    const { api, user } = renderWithProviders(<App />, { api: new FakeApi() });
    await screen.findByText('No namespaces yet.');

    await user.type(screen.getByLabelText('Namespace name'), 'plain');
    await user.click(screen.getByRole('button', { name: 'Create namespace' }));

    await screen.findByRole('link', { name: 'plain' });
    expect(api.callsTo('createNamespace')[0]!.args[0]).toEqual({
      name: 'plain',
      description: undefined,
    });
  });

  it('GIVEN a duplicate name WHEN created THEN the API error shows beside the form and input is kept', async () => {
    const { user } = renderWithProviders(<App />, { api: seeded(1, 'dup') });
    await screen.findByRole('link', { name: 'dup-00' });

    await user.type(screen.getByLabelText('Namespace name'), 'dup-00');
    await user.click(screen.getByRole('button', { name: 'Create namespace' }));

    const form = screen.getByRole('form', { name: 'Create namespace' });
    expect(await within(form).findByRole('alert')).toHaveTextContent(
      'Namespace "dup-00" already exists.',
    );
    expect(screen.getByLabelText('Namespace name')).toHaveValue('dup-00');
    expect(screen.queryByRole('status', { name: /created/ })).not.toBeInTheDocument();
  });

  it('GIVEN validation details WHEN creation fails THEN each detail is listed without stack traces', async () => {
    const api = new FakeApi();
    api.failNext(
      'createNamespace',
      new ApiError(400, 'VALIDATION_ERROR', 'Request validation failed.', [
        'name must be a string',
      ]),
    );
    const { user } = renderWithProviders(<App />, { api });
    await screen.findByText('No namespaces yet.');

    await user.click(screen.getByRole('button', { name: 'Create namespace' }));

    const alert = await screen.findByRole('alert');
    expect(alert).toHaveTextContent('name must be a string');
    expect(alert.textContent).not.toMatch(/at .*\.(js|ts)/);
  });
});

describe('NamespacesPage delete', () => {
  it('GIVEN a namespace WHEN deleting THEN a confirmation opens and confirming removes it with a toast', async () => {
    const { api, user } = renderWithProviders(<App />, { api: seeded(2) });
    await screen.findByRole('link', { name: 'ns-00' });

    await user.click(screen.getByRole('button', { name: 'Delete namespace ns-00' }));
    const dialog = screen.getByRole('alertdialog', { name: 'Delete namespace?' });
    expect(dialog).toHaveFocus();
    expect(dialog).toHaveTextContent('ns-00');
    await user.click(within(dialog).getByRole('button', { name: 'Delete' }));

    await waitFor(() =>
      expect(screen.queryByRole('link', { name: 'ns-00' })).not.toBeInTheDocument(),
    );
    expect(api.callsTo('deleteNamespace')[0]!.args).toEqual(['ns-00']);
    expect(screen.queryByRole('alertdialog')).not.toBeInTheDocument();
    expect(toast()).toHaveTextContent('Namespace deleted');
  });

  it('GIVEN the confirmation WHEN cancelled or dismissed with Escape THEN nothing is deleted and focus returns', async () => {
    const { api, user } = renderWithProviders(<App />, { api: seeded(1) });
    await screen.findByRole('link', { name: 'ns-00' });
    const opener = screen.getByRole('button', { name: 'Delete namespace ns-00' });

    await user.click(opener);
    await user.click(screen.getByRole('button', { name: 'Cancel' }));
    expect(screen.queryByRole('alertdialog')).not.toBeInTheDocument();

    await user.click(opener);
    await user.keyboard('{Escape}');
    expect(screen.queryByRole('alertdialog')).not.toBeInTheDocument();
    expect(opener).toHaveFocus();
    expect(api.callsTo('deleteNamespace')).toHaveLength(0);
  });

  it('GIVEN the last row of page 2 WHEN deleted THEN the list goes back to page 1', async () => {
    const { user } = renderWithProviders(<App />, { api: seeded(11) });
    await screen.findByText('Page 1 of 2 (11 total)');
    await user.click(screen.getByRole('button', { name: 'Next page' }));
    await screen.findByRole('link', { name: 'ns-10' });

    await user.click(screen.getByRole('button', { name: 'Delete namespace ns-10' }));
    await user.click(
      within(screen.getByRole('alertdialog')).getByRole('button', { name: 'Delete' }),
    );

    expect(await screen.findByText('Page 1 of 1 (10 total)')).toBeInTheDocument();
    expect(rowNames()).toHaveLength(10);
  });

  it('GIVEN a failing delete WHEN confirmed THEN a banner explains it and the row stays', async () => {
    const api = seeded(1);
    api.failNext(
      'deleteNamespace',
      new ApiError(404, 'NAMESPACE_NOT_FOUND', 'Namespace "ns-00" was not found.'),
    );
    const { user } = renderWithProviders(<App />, { api });
    await screen.findByRole('link', { name: 'ns-00' });

    await user.click(screen.getByRole('button', { name: 'Delete namespace ns-00' }));
    await user.click(
      within(screen.getByRole('alertdialog')).getByRole('button', { name: 'Delete' }),
    );

    expect(await screen.findByRole('alert')).toHaveTextContent('was not found');
    expect(screen.getByRole('link', { name: 'ns-00' })).toBeInTheDocument();
  });
});
