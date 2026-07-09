import { describe, expect, it } from 'vitest';
import { screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { FakeOkvnsApi } from '../test/fake-api';
import { renderApp } from '../test/render';

describe('ImportPage', () => {
  it('imports valid YAML and shows the imported namespaces', async () => {
    const api = new FakeOkvnsApi();
    api.seed([{ name: 'users', entries: [] }]);
    renderApp(api, '/import');

    await userEvent.type(
      await screen.findByLabelText('YAML'),
      'namespace: users',
    );
    await userEvent.click(screen.getByRole('button', { name: 'Import' }));

    expect(await screen.findByRole('heading', { name: 'Imported namespaces' })).toBeInTheDocument();
    expect(screen.getByText('users')).toBeInTheDocument();
  });

  it('shows an error and preserves content when import is invalid', async () => {
    const api = new FakeOkvnsApi();
    renderApp(api, '/import');

    const textarea = await screen.findByLabelText('YAML');
    await userEvent.type(textarea, 'bogus');
    await userEvent.click(screen.getByRole('button', { name: 'Import' }));

    expect(await screen.findByRole('alert')).toHaveTextContent(/not valid/i);
    expect(textarea).toHaveValue('bogus');
  });

  it('imports an uploaded YAML file and shows the imported namespaces', async () => {
    const api = new FakeOkvnsApi();
    api.seed([{ name: 'users', entries: [] }]);
    renderApp(api, '/import');

    const file = new File(['namespace: users'], 'import.yaml', { type: 'application/x-yaml' });
    await userEvent.upload(await screen.findByLabelText('YAML file'), file);
    await userEvent.click(screen.getByRole('button', { name: 'Import file' }));

    expect(await screen.findByRole('heading', { name: 'Imported namespaces' })).toBeInTheDocument();
    expect(screen.getByText('users')).toBeInTheDocument();
  });

  it('shows an error when an uploaded YAML file is invalid', async () => {
    const api = new FakeOkvnsApi();
    renderApp(api, '/import');

    const file = new File(['bogus'], 'bad.yaml', { type: 'application/x-yaml' });
    await userEvent.upload(await screen.findByLabelText('YAML file'), file);
    await userEvent.click(screen.getByRole('button', { name: 'Import file' }));

    expect(await screen.findByRole('alert')).toHaveTextContent(/not valid/i);
  });
});

describe('ExportPage', () => {
  it('exports all namespaces into the output', async () => {
    const api = new FakeOkvnsApi();
    api.seed([
      { name: 'users', entries: [] },
      { name: 'settings', entries: [] },
    ]);
    renderApp(api, '/export');

    await userEvent.click(await screen.findByRole('button', { name: 'Export all namespaces' }));

    const output = (await screen.findByLabelText('Exported YAML')) as HTMLTextAreaElement;
    expect(output.value).toContain('users');
    expect(output.value).toContain('settings');
  });

  it('exports only the selected namespace', async () => {
    const api = new FakeOkvnsApi();
    api.seed([
      { name: 'users', entries: [] },
      { name: 'settings', entries: [] },
    ]);
    renderApp(api, '/export');

    await userEvent.selectOptions(await screen.findByLabelText('Namespace'), 'settings');
    await userEvent.click(screen.getByRole('button', { name: 'Export selected namespace' }));

    const output = (await screen.findByLabelText('Exported YAML')) as HTMLTextAreaElement;
    expect(output.value).toContain('settings');
    expect(output.value).not.toContain('users');
  });
});
