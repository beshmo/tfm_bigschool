import { useState, type FormEvent } from 'react';
import type { NamespaceDto } from '@okvns/shared';
import { useApi } from '../api/api-context';
import { messageOf } from '../api/error-message';
import { ErrorBanner } from '../components/ErrorBanner';

const PLACEHOLDER = `namespaces:
  - name: users
    entries:
      - name: admin
        value: secret`;

export function ImportPage() {
  const api = useApi();
  const [markdown, setMarkdown] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [imported, setImported] = useState<NamespaceDto[] | null>(null);

  async function onImport(event: FormEvent) {
    event.preventDefault();
    setError(null);
    try {
      const namespaces = await api.importMarkdown(markdown);
      setImported(namespaces);
    } catch (err) {
      // Keep the submitted content available for correction.
      setImported(null);
      setError(messageOf(err));
    }
  }

  return (
    <section>
      <h1>Import markdown</h1>
      <form onSubmit={onImport} aria-label="Import markdown">
        <label htmlFor="import-markdown">Markdown</label>
        <textarea
          id="import-markdown"
          rows={12}
          placeholder={PLACEHOLDER}
          value={markdown}
          onChange={(event) => setMarkdown(event.target.value)}
        />
        <button type="submit">Import</button>
      </form>

      {error && <ErrorBanner message={error} />}

      {imported && (
        <div>
          <h2>Imported namespaces</h2>
          <ul>
            {imported.map((namespace) => (
              <li key={namespace.name}>{namespace.name}</li>
            ))}
          </ul>
        </div>
      )}
    </section>
  );
}
