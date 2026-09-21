import { useEffect, useState } from 'react';
import { useApi } from '../api/api-context';
import { toDisplayError, type DisplayError } from '../api/error-message';
import { Corners } from '../components/Blueprint';
import { ErrorBanner } from '../components/ErrorBanner';
import { Icon } from '../components/Icon';
import { useToast } from '../components/Toast';

const PAGE_SIZE = 100;

export function ExportPage() {
  const api = useApi();
  const notify = useToast();
  const [names, setNames] = useState<string[]>([]);
  const [selected, setSelected] = useState('');
  const [yaml, setYaml] = useState<string>();
  const [filename, setFilename] = useState('okvns-export.yaml');
  const [error, setError] = useState<DisplayError>();

  // Pages through every namespace (100 at a time, by name) to fill the selector.
  useEffect(() => {
    let active = true;
    (async () => {
      const all: string[] = [];
      let page = 1;
      let totalPages = 1;
      while (page <= totalPages) {
        const result = await api.listNamespaces({
          page,
          pageSize: PAGE_SIZE,
          sort: 'name',
          direction: 'asc',
        });
        all.push(...result.items.map((item) => item.name));
        totalPages = result.total_pages;
        page += 1;
      }
      if (active) setNames(all);
    })().catch((failure: unknown) => {
      if (active) setError(toDisplayError(failure));
    });
    return () => {
      active = false;
    };
  }, [api]);

  async function run(load: () => Promise<string>, name: string) {
    setError(undefined);
    try {
      setYaml(await load());
      setFilename(name);
    } catch (failure) {
      setError(toDisplayError(failure));
    }
  }

  function download() {
    if (yaml === undefined) return;
    const url = URL.createObjectURL(new Blob([yaml], { type: 'application/x-yaml' }));
    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    link.click();
    URL.revokeObjectURL(url);
  }

  async function copy() {
    if (yaml === undefined) return;
    try {
      await navigator.clipboard.writeText(yaml);
      notify('YAML copied');
    } catch {
      setError({
        title: 'Copy failed',
        message: 'The browser did not allow copying. Select the text and copy it manually.',
        details: [],
      });
    }
  }

  return (
    <>
      <div className="page-head">
        <div>
          <h1>Export YAML</h1>
          <p className="sub">Raw canonical YAML, ready to copy or save as a .yaml file.</p>
        </div>
      </div>

      <section className="block">
        <h2>Choose what to export</h2>
        <div className="panel blueprint">
          <Corners />
          {error ? <ErrorBanner error={error} /> : null}
          <div className="inline-form">
            <button
              type="button"
              className="btn btn-primary blueprint"
              onClick={() => run(() => api.exportAll(), 'okvns-export.yaml')}
            >
              <Corners />
              Export all namespaces
            </button>
          </div>
          <div className="inline-form">
            <div className="field">
              <label htmlFor="export-namespace">Namespace</label>
              <select
                id="export-namespace"
                className="input"
                value={selected}
                onChange={(event) => setSelected(event.target.value)}
              >
                <option value="">Select a namespace</option>
                {names.map((name) => (
                  <option key={name} value={name}>
                    {name}
                  </option>
                ))}
              </select>
            </div>
            <button
              type="button"
              className="btn btn-secondary"
              disabled={selected === ''}
              onClick={() => run(() => api.exportNamespace(selected), `${selected}.yaml`)}
            >
              Export selected namespace
            </button>
          </div>
        </div>
      </section>

      {yaml !== undefined ? (
        <section className="block">
          <h2>Result</h2>
          <div className="panel blueprint">
            <Corners />
            <pre className="entry-value" aria-label="Output" tabIndex={0}>
              {yaml}
            </pre>
            <div className="inline-form">
              <button type="button" className="btn btn-secondary" onClick={copy}>
                <Icon name="copy" />
                Copy YAML
              </button>
              <button type="button" className="btn btn-secondary" onClick={download}>
                <Icon name="download" />
                Download .yaml
              </button>
            </div>
          </div>
        </section>
      ) : null}
    </>
  );
}
