import { useCallback, useEffect, useState, type FormEvent } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import type { NamespaceDto } from '@okvns/shared';
import { useApi } from '../api/api-context';
import { messageOf } from '../api/error-message';
import { ErrorBanner } from '../components/ErrorBanner';
import { Timestamps } from '../components/Timestamps';

export function NamespaceDetailPage() {
  const api = useApi();
  const navigate = useNavigate();
  const { name = '' } = useParams();
  const [namespace, setNamespace] = useState<NamespaceDto | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [renameTo, setRenameTo] = useState('');
  const [entryName, setEntryName] = useState('');
  const [entryValue, setEntryValue] = useState('');

  const reload = useCallback(async () => {
    setLoading(true);
    try {
      const dto = await api.getNamespace(name);
      setNamespace(dto);
      setRenameTo(dto.name);
      setError(null);
    } catch (err) {
      setNamespace(null);
      setError(messageOf(err));
    } finally {
      setLoading(false);
    }
  }, [api, name]);

  useEffect(() => {
    void reload();
  }, [reload]);

  async function onRename(event: FormEvent) {
    event.preventDefault();
    setError(null);
    try {
      const updated = await api.renameNamespace(name, renameTo.trim());
      navigate(`/namespaces/${encodeURIComponent(updated.name)}`);
    } catch (err) {
      setError(messageOf(err));
    }
  }

  async function onDeleteNamespace() {
    setError(null);
    try {
      await api.deleteNamespace(name);
      navigate('/');
    } catch (err) {
      setError(messageOf(err));
    }
  }

  async function onCreateEntry(event: FormEvent) {
    event.preventDefault();
    setError(null);
    try {
      await api.createEntry(name, entryName.trim(), entryValue);
      setEntryName('');
      setEntryValue('');
      await reload();
    } catch (err) {
      setError(messageOf(err));
    }
  }

  async function onSaveValue(event: FormEvent<HTMLFormElement>, entry: string) {
    event.preventDefault();
    setError(null);
    const value = String(new FormData(event.currentTarget).get('value') ?? '');
    try {
      await api.updateEntry(name, entry, { value });
      await reload();
    } catch (err) {
      setError(messageOf(err));
    }
  }

  async function onDeleteEntry(entry: string) {
    setError(null);
    try {
      await api.deleteEntry(name, entry);
      await reload();
    } catch (err) {
      setError(messageOf(err));
    }
  }

  if (loading) {
    return <p>Loading…</p>;
  }

  if (!namespace) {
    return (
      <section>
        <p>
          <Link to="/">← Back to namespaces</Link>
        </p>
        {error && <ErrorBanner message={error} />}
      </section>
    );
  }

  return (
    <section>
      <p>
        <Link to="/">← Back to namespaces</Link>
      </p>
      <h1>Namespace: {namespace.name}</h1>
      <Timestamps createdAt={namespace.created_at} modifiedAt={namespace.modified_at} />

      {error && <ErrorBanner message={error} />}

      <form onSubmit={onRename} aria-label="Rename namespace">
        <label htmlFor="rename-namespace">New name</label>
        <input
          id="rename-namespace"
          value={renameTo}
          onChange={(event) => setRenameTo(event.target.value)}
        />
        <button type="submit">Rename</button>
      </form>

      <button
        type="button"
        aria-label={`Delete namespace ${namespace.name}`}
        onClick={onDeleteNamespace}
      >
        Delete namespace
      </button>

      <h2>Entries</h2>
      <form onSubmit={onCreateEntry} aria-label="Create entry">
        <label htmlFor="entry-name">Entry name</label>
        <input id="entry-name" value={entryName} onChange={(e) => setEntryName(e.target.value)} />
        <label htmlFor="entry-value">Entry value</label>
        <input
          id="entry-value"
          value={entryValue}
          onChange={(e) => setEntryValue(e.target.value)}
        />
        <button type="submit">Add entry</button>
      </form>

      {namespace.entries.length === 0 ? (
        <p>No entries yet.</p>
      ) : (
        <ul>
          {namespace.entries.map((entry) => (
            <li key={entry.name}>
              <form
                aria-label={`Edit entry ${entry.name}`}
                onSubmit={(e) => onSaveValue(e, entry.name)}
              >
                <span>{entry.name}</span>
                <input
                  name="value"
                  defaultValue={entry.value}
                  aria-label={`Value for ${entry.name}`}
                />
                <button type="submit">Save</button>
              </form>
              <Timestamps createdAt={entry.created_at} modifiedAt={entry.modified_at} />
              <button
                type="button"
                aria-label={`Delete entry ${entry.name}`}
                onClick={() => onDeleteEntry(entry.name)}
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
