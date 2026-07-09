import { useCallback, useEffect, useState } from 'react';
import type { NamespaceDto } from '@okvns/shared';
import { useApi } from '../api/api-context';
import { messageOf } from '../api/error-message';
import { ErrorBanner } from '../components/ErrorBanner';

export function ExportPage() {
  const api = useApi();
  const [namespaces, setNamespaces] = useState<NamespaceDto[]>([]);
  const [selected, setSelected] = useState('');
  const [yaml, setYaml] = useState('');
  const [error, setError] = useState<string | null>(null);

  const reload = useCallback(async () => {
    try {
      const list = await api.listNamespaces();
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
