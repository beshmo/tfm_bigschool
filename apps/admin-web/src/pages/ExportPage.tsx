import { useCallback, useEffect, useState } from 'react';
import type { NamespaceListItemDto } from '@okvns/shared';
import { useApi } from '../api/api-context';
import type { OkvnsApi } from '../api/okvns-api';
import { messageOf } from '../api/error-message';
import { ErrorBanner } from '../components/ErrorBanner';

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
  const [namespaces, setNamespaces] = useState<NamespaceListItemDto[]>([]);
  const [selected, setSelected] = useState('');
  const [yaml, setYaml] = useState('');
  const [error, setError] = useState<string | null>(null);

  const reload = useCallback(async () => {
    try {
      const list = await fetchAllNamespaces(api);
      setNamespaces(list);
      if (list.length > 0) {
        setSelected((current) => current || list[0].name);
      }
    } catch (err) {
      setError(messageOf(err));
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
      setError(messageOf(err));
    }
  }

  async function onExportSelected() {
    setError(null);
    try {
      setYaml(await api.exportNamespace(selected));
    } catch (err) {
      setError(messageOf(err));
    }
  }

  async function onCopy() {
    if (navigator.clipboard) {
      await navigator.clipboard.writeText(yaml);
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
    <section>
      <h1>Export YAML</h1>

      <div>
        <button type="button" onClick={onExportAll}>
          Export all namespaces
        </button>
      </div>

      <div>
        <label htmlFor="export-namespace">Namespace</label>
        <select
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
        <button type="button" onClick={onExportSelected} disabled={!selected}>
          Export selected namespace
        </button>
      </div>

      {error && <ErrorBanner message={error} />}

      {yaml && (
        <div>
          <label htmlFor="export-output">Exported YAML</label>
          <textarea id="export-output" rows={12} readOnly value={yaml} />
          <button type="button" onClick={onCopy}>
            Copy
          </button>
          <button type="button" onClick={onDownload}>
            Download
          </button>
        </div>
      )}
    </section>
  );
}
