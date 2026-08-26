import { useState, type ChangeEvent, type FormEvent } from 'react';
import type { NamespaceDto } from '@okvns/shared';
import { useApi } from '../api/api-context';
import { messageOf } from '../api/error-message';
import { Corners } from '../components/Blueprint';
import { ErrorBanner } from '../components/ErrorBanner';
import { Icon } from '../components/Icon';
import { useToast } from '../components/Toast';

const PLACEHOLDER = `namespaces:
  - name: users
    entries:
      - name: admin
        value: secret`;

export function ImportPage() {
  const api = useApi();
  const notify = useToast();
  const [yaml, setYaml] = useState('');
  const [file, setFile] = useState<File | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [imported, setImported] = useState<NamespaceDto[] | null>(null);

  /** Reports a completed import; both entry points land here. */
  function onImported(namespaces: NamespaceDto[]) {
    setImported(namespaces);
    const count = namespaces.length;
    notify('Import complete', `${count} ${count === 1 ? 'namespace' : 'namespaces'} imported.`);
  }

  async function onImport(event: FormEvent) {
    event.preventDefault();
    setError(null);
    try {
      onImported(await api.importYaml(yaml));
    } catch (err) {
      // Keep the submitted content available for correction.
      setImported(null);
      setError(messageOf(err));
    }
  }

  function onFileChange(event: ChangeEvent<HTMLInputElement>) {
    setFile(event.target.files?.[0] ?? null);
  }

  async function onImportFile(event: FormEvent) {
    event.preventDefault();
    setError(null);
    if (!file) {
      return;
    }
    try {
      onImported(await api.importYamlFile(file));
    } catch (err) {
      // Leave the selected file visible so the user can retry or choose another.
      setImported(null);
      setError(messageOf(err));
    }
  }

  return (
    <>
      <div className="page-head">
        <div>
          <h1>Import YAML</h1>
          <p className="sub">Load namespaces and entries from a YAML document</p>
        </div>
      </div>

      <section className="block">
        <h2>Paste YAML</h2>
        <form className="panel blueprint" aria-label="Import YAML" onSubmit={onImport}>
          <Corners />
          <div className="field">
            <label htmlFor="import-yaml">YAML</label>
            <textarea
              className="input entry-value"
              id="import-yaml"
              rows={10}
              placeholder={PLACEHOLDER}
              value={yaml}
              onChange={(event) => setYaml(event.target.value)}
            />
          </div>
          <button type="submit" className="btn btn-primary blueprint">
            <Corners />
            Import
          </button>
        </form>
      </section>

      <section className="block">
        <h2>Import a file</h2>
        <form className="panel blueprint" aria-label="Import YAML file" onSubmit={onImportFile}>
          <Corners />
          <div className="field">
            <label htmlFor="import-yaml-file">YAML file</label>
            <div className="file-drop">
              <input
                className="input"
                id="import-yaml-file"
                type="file"
                accept=".yaml,.yml"
                style={{ maxWidth: '320px' }}
                onChange={onFileChange}
              />
            </div>
          </div>
          <button type="submit" className="btn btn-secondary blueprint" disabled={!file}>
            <Corners />
            <Icon name="upload" />
            Import file
          </button>
        </form>
      </section>

      {error && <ErrorBanner title="Couldn't import YAML" message={error} />}

      {imported && (
        <section className="block">
          <h2>Imported namespaces</h2>
          <div className="table-wrap">
            <table className="table">
              <thead>
                <tr>
                  <th>Name</th>
                </tr>
              </thead>
              <tbody>
                {imported.map((namespace) => (
                  <tr key={namespace.name}>
                    <td>
                      <span className="tag tag-accent">{namespace.name}</span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      )}
    </>
  );
}
