import { useCallback, useEffect, useState, type FormEvent } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import {
  ENTRY_SORT_FIELDS,
  PAGE_SIZES,
  type EntryDto,
  type EntryListQuery,
  type NamespaceDto,
  type PaginatedResultDto,
} from '@okvns/shared';
import { useApi } from '../api/api-context';
import { messageOf } from '../api/error-message';
import { ErrorBanner } from '../components/ErrorBanner';
import { Timestamps } from '../components/Timestamps';
import { ListControls } from '../components/ListControls';
import { Pagination } from '../components/Pagination';

const INITIAL_QUERY: EntryListQuery = { page: 1, page_size: 10, sort: 'name', direction: 'asc' };

export function NamespaceDetailPage() {
  const api = useApi();
  const navigate = useNavigate();
  const { name = '' } = useParams();
  const [namespace, setNamespace] = useState<NamespaceDto | null>(null);
  const [entries, setEntries] = useState<PaginatedResultDto<EntryDto> | null>(null);
  const [query, setQuery] = useState<EntryListQuery>(INITIAL_QUERY);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [renameTo, setRenameTo] = useState('');
  const [describeAs, setDescribeAs] = useState('');
  const [entryName, setEntryName] = useState('');
  const [entryValue, setEntryValue] = useState('');
  const [entryDescription, setEntryDescription] = useState('');
  const [entryEnvDependent, setEntryEnvDependent] = useState(false);

  /** Loads the namespace itself; its entries are paged separately. */
  const reloadNamespace = useCallback(async () => {
    setLoading(true);
    try {
      const dto = await api.getNamespace(name);
      setNamespace(dto);
      setRenameTo(dto.name);
      setDescribeAs(dto.description ?? '');
      setError(null);
    } catch (err) {
      setNamespace(null);
      setError(messageOf(err));
    } finally {
      setLoading(false);
    }
  }, [api, name]);

  /**
   * Loads the active page of entries from the entry list endpoint, so filtering,
   * ordering, and paging are decided by the API rather than by slicing the
   * namespace detail's entry array.
   */
  const reloadEntries = useCallback(async () => {
    try {
      setEntries(await api.listEntries(name, query));
    } catch (err) {
      setError(messageOf(err));
    }
  }, [api, name, query]);

  useEffect(() => {
    void reloadNamespace();
  }, [reloadNamespace]);

  useEffect(() => {
    void reloadEntries();
  }, [reloadEntries]);

  /** Reloads both the namespace (its modified_at moves) and the entry page. */
  async function reloadAfterEntryChange() {
    await Promise.all([reloadNamespace(), reloadEntries()]);
  }

  function updateQuery(changes: Partial<EntryListQuery>) {
    // Any change to the result set returns to the first page, since the current
    // page may not exist under the new query.
    setQuery((current) => ({ ...current, page: 1, ...changes }));
  }

  async function onRename(event: FormEvent) {
    event.preventDefault();
    setError(null);
    try {
      const updated = await api.updateNamespace(name, { name: renameTo.trim() });
      navigate(`/namespaces/${encodeURIComponent(updated.name)}`);
    } catch (err) {
      setError(messageOf(err));
    }
  }

  async function onSaveDescription(event: FormEvent) {
    event.preventDefault();
    setError(null);
    try {
      await api.updateNamespace(name, { description: describeAs });
      await reloadNamespace();
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
      await api.createEntry(
        name,
        entryName.trim(),
        entryValue,
        entryDescription,
        entryEnvDependent,
      );
      setEntryName('');
      setEntryValue('');
      setEntryDescription('');
      setEntryEnvDependent(false);
      await reloadAfterEntryChange();
    } catch (err) {
      setError(messageOf(err));
    }
  }

  async function onSaveValue(event: FormEvent<HTMLFormElement>, entry: string) {
    event.preventDefault();
    setError(null);
    const form = new FormData(event.currentTarget);
    const value = String(form.get('value') ?? '');
    const description = String(form.get('description') ?? '');
    // An unchecked checkbox is absent from the form data, and the form always
    // renders the entry's current state, so absence means the admin cleared it.
    const envDependent = form.get('env_dependent') !== null;
    try {
      await api.updateEntry(name, entry, { value, description, env_dependent: envDependent });
      await reloadAfterEntryChange();
    } catch (err) {
      setError(messageOf(err));
    }
  }

  async function onDeleteEntry(entry: string) {
    setError(null);
    try {
      await api.deleteEntry(name, entry);
      // Deleting the last entry on a trailing page would strand the admin on a
      // page that no longer exists, so step back to the last page with rows.
      const remaining = (entries?.total_items ?? 1) - 1;
      const lastPage = Math.max(1, Math.ceil(remaining / query.page_size));
      if (query.page > lastPage) {
        setQuery((current) => ({ ...current, page: lastPage }));
        await reloadNamespace();
      } else {
        await reloadAfterEntryChange();
      }
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
      {namespace.description && <p>{namespace.description}</p>}
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

      <form onSubmit={onSaveDescription} aria-label="Edit namespace description">
        <label htmlFor="namespace-description">Description (optional)</label>
        <textarea
          id="namespace-description"
          rows={2}
          value={describeAs}
          onChange={(event) => setDescribeAs(event.target.value)}
        />
        <button type="submit">Save description</button>
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
        <label htmlFor="entry-description">Entry description (optional)</label>
        <textarea
          id="entry-description"
          rows={2}
          value={entryDescription}
          onChange={(e) => setEntryDescription(e.target.value)}
        />
        <input
          id="entry-env-dependent"
          type="checkbox"
          checked={entryEnvDependent}
          onChange={(e) => setEntryEnvDependent(e.target.checked)}
        />
        <label htmlFor="entry-env-dependent">Environment-dependent</label>
        <button type="submit">Add entry</button>
      </form>

      <ListControls
        idPrefix="entry"
        label="entries"
        sortFields={ENTRY_SORT_FIELDS}
        pageSizes={PAGE_SIZES}
        query={query}
        onChange={updateQuery}
      />

      <input
        id="filter-env-dependent"
        type="checkbox"
        checked={query.env_dependent === true}
        onChange={(e) => updateQuery({ env_dependent: e.target.checked ? true : undefined })}
      />
      <label htmlFor="filter-env-dependent">Show only environment-dependent entries</label>

      {!entries || entries.total_items === 0 ? (
        <p>{describeEmptyEntries(query)}</p>
      ) : (
        <>
          <ul>
            {entries.items.map((entry) => (
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
                  <textarea
                    name="description"
                    rows={2}
                    defaultValue={entry.description ?? ''}
                    aria-label={`Description for ${entry.name}`}
                  />
                  <input
                    name="env_dependent"
                    type="checkbox"
                    defaultChecked={entry.env_dependent}
                    aria-label={`Environment-dependent for ${entry.name}`}
                  />
                  <button type="submit">Save</button>
                </form>
                {entry.env_dependent && <p>Environment-dependent</p>}
                {entry.description && <p>{entry.description}</p>}
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
          <Pagination
            label="entries"
            result={entries}
            onPage={(page) => setQuery((current) => ({ ...current, page }))}
          />
        </>
      )}
    </section>
  );
}

/** Explains an empty entry list in terms of the filters that produced it. */
function describeEmptyEntries(query: EntryListQuery): string {
  if (query.env_dependent === true) {
    return 'No environment-dependent entries.';
  }
  return query.name ? 'No entries match the filter.' : 'No entries yet.';
}
