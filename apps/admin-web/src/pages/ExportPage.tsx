import { useCallback, useEffect, useState } from 'react';
import type { NamespaceListItemDto } from '@okvns/shared';
import { useApi } from '../api/api-context';
import type { OkvnsApi } from '../api/okvns-api';
import { messageOf } from '../api/error-message';
import { Corners } from '../components/Blueprint';
import { ErrorBanner } from '../components/ErrorBanner';
import { Icon } from '../components/Icon';
import { useToast } from '../components/Toast';

/** Largest page the API will serve; used to drain the list in few requests. */
const MAX_PAGE_SIZE = 100;

/**
 * Collects every namespace by walking the paginated list endpoint.
 *
 * The export picker must offer all namespaces, not just the first page — an
 * admin cannot export a namespace that never appears in the dropdown. This is
 * the one place the admin frontend deliberately reads past a single page.
 */
async function fetchAllNamespaces(api: OkvnsApi): Promise<NamespaceListItemDto[]> {
  const collected: NamespaceListItemDto[] = [];
  let page = 1;
  let totalPages = 1;
  do {
    const result = await api.listNamespaces({ page, page_size: MAX_PAGE_SIZE, sort: 'name' });
    collected.push(...result.items);
    totalPages = result.total_pages;
    page += 1;
  } while (page <= totalPages);
  return collected;
}

export function ExportPage() {
  const api = useApi();
  const notify = useToast();
  const [namespaces, setNamespaces] = useState<NamespaceListItemDto[]>([]);
  const [selected, setSelected] = useState('');
  const [yaml, setYaml] = useState('');
  const [error, setError] = useState<{ title: string; message: string } | null>(null);

  const reload = useCallback(async () => {
    try {
      const list = await fetchAllNamespaces(api);
      setNamespaces(list);
      if (list.length > 0) {
        setSelected((current) => current || list[0].name);
      }
    } catch (err) {
      setError({ title: "Couldn't load namespaces", message: messageOf(err) });
    }
  }, [api]);

  useEffect(() => {
    void reload();
  }, [reload]);

  async function onExportAll() {
    setError(null);
    try {
      setYaml(await api.exportAll());
    } catch (err) {
      setError({ title: "Couldn't export namespaces", message: messageOf(err) });
    }
  }

  async function onExportSelected() {
    setError(null);
    try {
      setYaml(await api.exportNamespace(selected));
    } catch (err) {
      setError({ title: "Couldn't export namespace", message: messageOf(err) });
    }
  }

  async function onCopy() {
    if (navigator.clipboard) {
      await navigator.clipboard.writeText(yaml);
      notify('Copied to clipboard', 'YAML copied.');
    }
  }

  function onDownload() {
    const blob = new Blob([yaml], { type: 'application/yaml' });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement('a');
    anchor.href = url;
    anchor.download = 'okvns-export.yaml';
    anchor.click();
    URL.revokeObjectURL(url);
  }

  return (
    <>
      <div className="page-head">
        <div>
          <h1>Export YAML</h1>
          <p className="sub">Download namespaces and entries as a YAML document</p>
        </div>
      </div>

      <section className="block">
        <h2>Export everything</h2>
        <div className="panel blueprint">
          <Corners />
          <p className="cell-desc">Every namespace and every entry, in one file.</p>
          <button type="button" className="btn btn-primary blueprint" onClick={onExportAll}>
            <Corners />
            Export all namespaces
          </button>
        </div>
      </section>

      <section className="block">
        <h2>Export one namespace</h2>
        <div className="panel blueprint">
          <Corners />
          <div className="inline-form">
            <div className="field" style={{ minWidth: '240px' }}>
              <label htmlFor="export-namespace">Namespace</label>
              <select
                className="input"
                id="export-namespace"
                value={selected}
                onChange={(event) => setSelected(event.target.value)}
              >
                {namespaces.map((namespace) => (
                  <option key={namespace.name} value={namespace.name}>
                    {namespace.name}
                  </option>
                ))}
              </select>
            </div>
            <button
              type="button"
              className="btn btn-secondary"
              onClick={onExportSelected}
              disabled={!selected}
            >
              Export selected namespace
            </button>
          </div>
        </div>
      </section>

      {error && <ErrorBanner title={error.title} message={error.message} />}

      {yaml && (
        <section className="block">
          <h2>Exported YAML</h2>
          <div className="panel blueprint">
            <Corners />
            <div className="field">
              <label htmlFor="export-output">Output</label>
              <textarea
                className="input entry-value"
                id="export-output"
                rows={10}
                readOnly
                value={yaml}
              />
            </div>
            <div className="inline-form" style={{ marginTop: 'var(--space-3)' }}>
              <button type="button" className="btn btn-secondary" onClick={onCopy}>
                <Icon name="copy" />
                Copy
              </button>
              <button type="button" className="btn btn-secondary" onClick={onDownload}>
                <Icon name="download" />
                Download
              </button>
            </div>
          </div>
        </section>
      )}
    </>
  );
}
