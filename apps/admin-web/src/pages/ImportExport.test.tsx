import { screen, waitFor, within } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { App } from '../App';
import { ApiError } from '../api/api-error';
import { FakeApi } from '../test/fake-api';
import { renderWithProviders, toast } from '../test/render';

afterEach(() => {
  vi.restoreAllMocks();
});

const imported = [
  {
    name: 'alpha',
    description: 'first',
    entries: [{ name: 'k', value: 'v' }],
    created_at: '',
    modified_at: '',
  },
  { name: 'beta', entries: [], created_at: '', modified_at: '' },
];

describe('ImportPage', () => {
  function importApi() {
    const api = new FakeApi();
    api.importResult = imported as never;
    return api;
  }

  it('GIVEN the page WHEN opened THEN it offers paste and file sections', () => {
    renderWithProviders(<App />, { api: importApi(), route: '/import' });

    expect(screen.getByRole('heading', { name: 'Import YAML' })).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: 'Paste YAML' })).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: 'Import a file' })).toBeInTheDocument();
    expect(screen.queryByRole('heading', { name: 'Imported namespaces' })).not.toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Import file' })).toBeDisabled();
  });

  it('GIVEN pasted YAML WHEN imported THEN it is sent as text and the imported namespaces are listed', async () => {
    const api = importApi();
    const { user } = renderWithProviders(<App />, { api, route: '/import' });

    await user.click(screen.getByLabelText('YAML', { exact: true }));
    await user.paste('namespaces:\n  - name: alpha\n    entries: []');
    await user.click(screen.getByRole('button', { name: 'Import' }));

    expect(await screen.findByRole('heading', { name: 'Imported namespaces' })).toBeInTheDocument();
    expect(api.callsTo('importYaml')[0]!.args).toEqual([
      'namespaces:\n  - name: alpha\n    entries: []',
    ]);
    expect(screen.getByRole('cell', { name: 'alpha' })).toBeInTheDocument();
    expect(screen.getByRole('cell', { name: 'first' })).toBeInTheDocument();
    expect(screen.getByRole('cell', { name: 'beta' })).toBeInTheDocument();
    expect(toast()).toHaveTextContent('Import complete');
    expect(screen.getByLabelText('YAML', { exact: true })).toHaveValue('');
  });

  it('GIVEN invalid pasted YAML WHEN imported THEN the API error shows and the content stays for correction', async () => {
    const api = importApi();
    api.failNext(
      'importYaml',
      new ApiError(400, 'INVALID_YAML', 'Unexpected key "owner" in namespaces[0].'),
    );
    const { user } = renderWithProviders(<App />, { api, route: '/import' });

    await user.click(screen.getByLabelText('YAML', { exact: true }));
    await user.paste('bad: yaml');
    await user.click(screen.getByRole('button', { name: 'Import' }));

    const form = screen.getByRole('form', { name: 'Paste YAML' });
    expect(await within(form).findByRole('alert')).toHaveTextContent('Unexpected key "owner"');
    expect(screen.getByLabelText('YAML', { exact: true })).toHaveValue('bad: yaml');
    expect(screen.queryByRole('heading', { name: 'Imported namespaces' })).not.toBeInTheDocument();
  });

  it('GIVEN a chosen file WHEN imported THEN the file itself is sent and the result is listed', async () => {
    const api = importApi();
    const { user } = renderWithProviders(<App />, { api, route: '/import' });
    const file = new File(['namespaces: []'], 'import.yaml', { type: 'application/x-yaml' });

    await user.upload(screen.getByLabelText('YAML file', { exact: true }), file);
    expect(screen.getByRole('button', { name: 'Import file' })).toBeEnabled();
    await user.click(screen.getByRole('button', { name: 'Import file' }));

    expect(await screen.findByRole('heading', { name: 'Imported namespaces' })).toBeInTheDocument();
    expect(api.callsTo('importYamlFile')[0]!.args[0]).toBe(file);
    expect(screen.getByRole('cell', { name: 'alpha' })).toBeInTheDocument();
  });

  it('GIVEN an invalid uploaded file WHEN imported THEN the error shows beside the file form without transport details', async () => {
    const api = importApi();
    api.failNext(
      'importYamlFile',
      new ApiError(400, 'INVALID_YAML', 'The uploaded file is not valid UTF-8 text.'),
    );
    const { user } = renderWithProviders(<App />, { api, route: '/import' });

    await user.upload(
      screen.getByLabelText('YAML file', { exact: true }),
      new File(['x'], 'bad.yaml'),
    );
    await user.click(screen.getByRole('button', { name: 'Import file' }));

    const form = screen.getByRole('form', { name: 'Import a file' });
    expect(await within(form).findByRole('alert')).toHaveTextContent('not valid UTF-8 text');
  });

  it('GIVEN a file input WHEN the selection is cleared THEN the import button disables again', async () => {
    const { user } = renderWithProviders(<App />, { api: importApi(), route: '/import' });
    const input = screen.getByLabelText('YAML file', { exact: true }) as HTMLInputElement;

    await user.upload(input, new File(['x'], 'a.yaml'));
    expect(screen.getByRole('button', { name: 'Import file' })).toBeEnabled();
    await user.upload(input, []);

    expect(screen.getByRole('button', { name: 'Import file' })).toBeDisabled();
  });
});

describe('ExportPage', () => {
  function exportApi(count = 3) {
    const api = new FakeApi();
    for (let index = 0; index < count; index++) {
      api.seed(`ns-${String(index).padStart(3, '0')}`);
    }
    api.exportResult =
      'namespaces:\n  - name: ns-000\n    description: exported description\n    entries: []\n';
    return api;
  }

  it('GIVEN namespaces WHEN opened THEN the selector lists them all, paging 100 at a time by name', async () => {
    const api = exportApi(101);
    renderWithProviders(<App />, { api, route: '/export' });

    await waitFor(() => expect(screen.getAllByRole('option')).toHaveLength(102));
    expect(api.callsTo('listNamespaces').map((call) => call.args[0])).toEqual([
      { page: 1, pageSize: 100, sort: 'name', direction: 'asc' },
      { page: 2, pageSize: 100, sort: 'name', direction: 'asc' },
    ]);
    expect(screen.getByRole('button', { name: 'Export selected namespace' })).toBeDisabled();
  });

  it('GIVEN the export-all button WHEN clicked THEN the YAML is shown as output', async () => {
    const api = exportApi();
    const { user } = renderWithProviders(<App />, { api, route: '/export' });

    await user.click(screen.getByRole('button', { name: 'Export all namespaces' }));

    const output = await screen.findByLabelText('Output');
    expect(output).toHaveTextContent('description: exported description');
    expect(api.callsTo('exportAll')).toHaveLength(1);
  });

  it('GIVEN a selected namespace WHEN exported THEN only that namespace is requested', async () => {
    const api = exportApi();
    const { user } = renderWithProviders(<App />, { api, route: '/export' });
    await waitFor(() => expect(screen.getAllByRole('option').length).toBeGreaterThan(1));

    await user.selectOptions(screen.getByLabelText('Namespace', { exact: true }), 'ns-001');
    await user.click(screen.getByRole('button', { name: 'Export selected namespace' }));

    expect(await screen.findByLabelText('Output')).toHaveTextContent('name: ns-001');
    expect(api.callsTo('exportNamespace')[0]!.args).toEqual(['ns-001']);
    expect(screen.getByLabelText('Output')).not.toHaveTextContent('ns-000');
  });

  it('GIVEN exported YAML WHEN copied THEN it goes to the clipboard and a toast confirms', async () => {
    const { user } = renderWithProviders(<App />, { api: exportApi(), route: '/export' });
    const write = vi.spyOn(navigator.clipboard, 'writeText');
    await user.click(screen.getByRole('button', { name: 'Export all namespaces' }));
    await screen.findByLabelText('Output');

    await user.click(screen.getByRole('button', { name: 'Copy YAML' }));

    expect(write).toHaveBeenCalledWith(expect.stringContaining('exported description'));
    expect(await screen.findByText('YAML copied')).toBeInTheDocument();
  });

  it('GIVEN a browser that refuses clipboard access WHEN copying THEN a banner explains it', async () => {
    const { user } = renderWithProviders(<App />, { api: exportApi(), route: '/export' });
    vi.spyOn(navigator.clipboard, 'writeText').mockRejectedValue(new Error('denied'));
    await user.click(screen.getByRole('button', { name: 'Export all namespaces' }));
    await screen.findByLabelText('Output');

    await user.click(screen.getByRole('button', { name: 'Copy YAML' }));

    expect(await screen.findByRole('alert')).toHaveTextContent('Copy failed');
  });

  it('GIVEN exported YAML WHEN downloaded THEN a .yaml file named after the export is offered', async () => {
    const createUrl = vi.fn(() => 'blob:okvns');
    const revoke = vi.fn();
    vi.stubGlobal(
      'URL',
      Object.assign(URL, { createObjectURL: createUrl, revokeObjectURL: revoke }),
    );
    const clicked: string[] = [];
    vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(function (
      this: HTMLAnchorElement,
    ) {
      clicked.push(this.download);
    });
    const { user } = renderWithProviders(<App />, { api: exportApi(), route: '/export' });
    await waitFor(() => expect(screen.getAllByRole('option').length).toBeGreaterThan(1));

    await user.click(screen.getByRole('button', { name: 'Export all namespaces' }));
    await screen.findByLabelText('Output');
    await user.click(screen.getByRole('button', { name: 'Download .yaml' }));
    await user.selectOptions(screen.getByLabelText('Namespace', { exact: true }), 'ns-002');
    await user.click(screen.getByRole('button', { name: 'Export selected namespace' }));
    await waitFor(() => expect(screen.getByLabelText('Output')).toHaveTextContent('ns-002'));
    await user.click(screen.getByRole('button', { name: 'Download .yaml' }));

    expect(clicked).toEqual(['okvns-export.yaml', 'ns-002.yaml']);
    expect(createUrl).toHaveBeenCalledTimes(2);
    expect(revoke).toHaveBeenCalledTimes(2);
    vi.unstubAllGlobals();
  });

  it('GIVEN a failing export WHEN requested THEN a banner is shown', async () => {
    const api = exportApi();
    api.failNext('exportAll', new ApiError(500, 'INTERNAL_ERROR', 'An unexpected error occurred.'));
    const { user } = renderWithProviders(<App />, { api, route: '/export' });

    await user.click(screen.getByRole('button', { name: 'Export all namespaces' }));

    expect(await screen.findByRole('alert')).toHaveTextContent('An unexpected error occurred.');
    expect(screen.queryByLabelText('Output')).not.toBeInTheDocument();
  });

  it('GIVEN a failing namespace list WHEN opened THEN a banner is shown', async () => {
    const api = exportApi();
    api.failNext(
      'listNamespaces',
      new ApiError(0, 'NETWORK_ERROR', 'Could not reach the OKVNS API.'),
    );

    renderWithProviders(<App />, { api, route: '/export' });

    expect(await screen.findByRole('alert')).toHaveTextContent('Could not reach the OKVNS API.');
  });
});
