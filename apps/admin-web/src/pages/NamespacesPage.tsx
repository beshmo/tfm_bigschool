import { useCallback, useEffect, useState, type FormEvent } from 'react';
import { Link } from 'react-router-dom';
import type { NamespaceDto } from '@okvns/shared';
import { useApi } from '../api/api-context';
import { messageOf } from '../api/error-message';
import { ErrorBanner } from '../components/ErrorBanner';
import { Timestamps } from '../components/Timestamps';

export function NamespacesPage() {
  const api = useApi();
  const [namespaces, setNamespaces] = useState<NamespaceDto[]>([]);
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  const reload = useCallback(async () => {
    try {
      setNamespaces(await api.listNamespaces());
    } catch (err) {
      setError(messageOf(err));
    } finally {
      setLoading(false);
    }
  }, [api]);

  useEffect(() => {
    void reload();
  }, [reload]);

  async function onCreate(event: FormEvent) {
    event.preventDefault();
    setError(null);
    try {
      await api.createNamespace(name.trim(), description);
      setName('');
      setDescription('');
      await reload();
    } catch (err) {
      setError(messageOf(err));
    }
  }

  async function onDelete(target: string) {
    setError(null);
    try {
      await api.deleteNamespace(target);
      await reload();
    } catch (err) {
      setError(messageOf(err));
    }
  }

  return (
    <section>
      <h1>Namespaces</h1>

      <form onSubmit={onCreate} aria-label="Create namespace">
        <label htmlFor="namespace-name">Namespace name</label>
        <input id="namespace-name" value={name} onChange={(event) => setName(event.target.value)} />
        <label htmlFor="namespace-description">Description (optional)</label>
        <textarea
          id="namespace-description"
          rows={2}
          value={description}
          onChange={(event) => setDescription(event.target.value)}
        />
        <button type="submit">Create namespace</button>
      </form>

      {error && <ErrorBanner message={error} />}

      {loading ? (
        <p>Loading…</p>
      ) : namespaces.length === 0 ? (
        <p>No namespaces yet.</p>
      ) : (
        <ul>
          {namespaces.map((namespace) => (
            <li key={namespace.name}>
              <Link to={`/namespaces/${encodeURIComponent(namespace.name)}`}>{namespace.name}</Link>
              {namespace.description && <p>{namespace.description}</p>}
              <Timestamps createdAt={namespace.created_at} modifiedAt={namespace.modified_at} />
              <button
                type="button"
                aria-label={`Delete namespace ${namespace.name}`}
                onClick={() => onDelete(namespace.name)}
              >
                Delete
              </button>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
