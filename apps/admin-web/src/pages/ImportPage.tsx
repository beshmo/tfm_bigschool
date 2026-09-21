import { useState, type FormEvent } from 'react';
import type { NamespaceDto } from '@okvns/shared';
import { useApi } from '../api/api-context';
import { toDisplayError, type DisplayError } from '../api/error-message';
import { Corners } from '../components/Blueprint';
import { ErrorBanner } from '../components/ErrorBanner';
import { useToast } from '../components/Toast';

export function ImportPage() {
  const api = useApi();
  const notify = useToast();
  const [yaml, setYaml] = useState('');
  const [pasteError, setPasteError] = useState<DisplayError>();
  const [file, setFile] = useState<File>();
  const [fileError, setFileError] = useState<DisplayError>();
  const [imported, setImported] = useState<NamespaceDto[]>();
  const [busy, setBusy] = useState(false);

  async function run(
    action: () => Promise<NamespaceDto[]>,
    onError: (error: DisplayError) => void,
    onSuccess: () => void,
  ) {
    setBusy(true);
    try {
      setImported(await action());
      notify('Import complete');
      onSuccess();
    } catch (error) {
      onError(toDisplayError(error));
    } finally {
      setBusy(false);
    }
  }

  function importPasted(event: FormEvent) {
    event.preventDefault();
    setPasteError(undefined);
    // The pasted content stays in the box on failure so it can be corrected.
    void run(
      () => api.importYaml(yaml),
      setPasteError,
      () => setYaml(''),
    );
  }

  function importFile(event: FormEvent) {
    event.preventDefault();
    if (!file) return;
    setFileError(undefined);
    void run(
      () => api.importYamlFile(file),
      setFileError,
      () => undefined,
    );
  }

  return (
    <>
      <div className="page-head">
        <div>
          <h1>Import YAML</h1>
          <p className="sub">
            Validated as a whole before anything is stored. Existing namespaces are replaced.
          </p>
        </div>
      </div>

      <section className="block">
        <h2>Paste YAML</h2>
        <form className="panel blueprint" aria-label="Paste YAML" onSubmit={importPasted}>
          <Corners />
          {pasteError ? <ErrorBanner error={pasteError} /> : null}
          <div className="field">
            <label htmlFor="import-yaml">YAML</label>
            <textarea
              id="import-yaml"
              className="input"
              rows={12}
              spellCheck={false}
              value={yaml}
              onChange={(event) => setYaml(event.target.value)}
            />
          </div>
          <button type="submit" className="btn btn-primary blueprint" disabled={busy}>
            <Corners />
            Import
          </button>
        </form>
      </section>

      <section className="block">
        <h2>Import a file</h2>
        <form className="panel blueprint" aria-label="Import a file" onSubmit={importFile}>
          <Corners />
          {fileError ? <ErrorBanner error={fileError} /> : null}
          <div className="field file-drop">
            <label htmlFor="import-file">YAML file</label>
            <input
              id="import-file"
              type="file"
              accept=".yaml,.yml,text/yaml,application/x-yaml,text/plain"
              onChange={(event) => setFile(event.target.files?.[0])}
            />
          </div>
          <button type="submit" className="btn btn-primary blueprint" disabled={busy || !file}>
            <Corners />
            Import file
          </button>
        </form>
      </section>

      {imported ? (
        <section className="block">
          <h2>Imported namespaces</h2>
          <div className="table-wrap">
            <table className="table">
              <thead>
                <tr>
                  <th>Name</th>
                  <th>Description</th>
                  <th>Entries</th>
                </tr>
              </thead>
              <tbody>
                {imported.map((namespace) => (
                  <tr key={namespace.name}>
                    <td>{namespace.name}</td>
                    <td className="cell-desc">{namespace.description ?? ''}</td>
                    <td>{namespace.entries.length}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      ) : null}
    </>
  );
}
