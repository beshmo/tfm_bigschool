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
import { Corners } from '../components/Blueprint';
import { ConfirmDialog } from '../components/ConfirmDialog';
import { EmptyState } from '../components/EmptyState';
import { EntryEditDialog, type EntryEdit } from '../components/EntryEditDialog';
import { ErrorBanner } from '../components/ErrorBanner';
import { Icon } from '../components/Icon';
import { ListControls } from '../components/ListControls';
import { Pagination } from '../components/Pagination';
import { TableSkeleton } from '../components/TableSkeleton';
import { DateCell, formatDate } from '../components/Timestamps';
import { useToast } from '../components/Toast';

const INITIAL_QUERY: EntryListQuery = { page: 1, page_size: 10, sort: 'name', direction: 'asc' };

const COLUMNS = ['Name', 'Value', 'Description', 'Flags', 'Modified', 'Actions'] as const;

export function NamespaceDetailPage() {
  const api = useApi();
  const navigate = useNavigate();
  const notify = useToast();
  const { name = '' } = useParams();
  const [namespace, setNamespace] = useState<NamespaceDto | null>(null);
  const [entries, setEntries] = useState<PaginatedResultDto<EntryDto> | null>(null);
  const [query, setQuery] = useState<EntryListQuery>(INITIAL_QUERY);
  const [error, setError] = useState<{ title: string; message: string } | null>(null);
  const [loading, setLoading] = useState(true);
  const [renameTo, setRenameTo] = useState('');
  const [describeAs, setDescribeAs] = useState('');
  const [entryName, setEntryName] = useState('');
  const [entryValue, setEntryValue] = useState('');
  const [entryDescription, setEntryDescription] = useState('');
  const [entryEnvDependent, setEntryEnvDependent] = useState(false);
  /** The entry open in the edit dialog, or null when it is closed. */
  const [editing, setEditing] = useState<EntryDto | null>(null);
  /** What a confirmation dialog is currently asking about, if anything. */
  const [confirming, setConfirming] = useState<
    { kind: 'namespace' } | { kind: 'entry'; name: string } | null
  >(null);

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
      setError({ title: "Couldn't load namespace", message: messageOf(err) });
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
      setError({ title: "Couldn't load entries", message: messageOf(err) });
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
    const renamed = renameTo.trim();
    try {
      const updated = await api.updateNamespace(name, { name: renamed });
      navigate(`/namespaces/${encodeURIComponent(updated.name)}`);
      notify('Namespace renamed', `Now "${updated.name}".`);
    } catch (err) {
      setError({ title: "Couldn't rename namespace", message: messageOf(err) });
    }
  }

  async function onSaveDescription(event: FormEvent) {
    event.preventDefault();
    setError(null);
    try {
      await api.updateNamespace(name, { description: describeAs });
      await reloadNamespace();
      notify('Changes saved', `Description for "${name}" was updated.`);
    } catch (err) {
      setError({ title: "Couldn't save description", message: messageOf(err) });
    }
  }

  async function onDeleteNamespace() {
    setError(null);
    setConfirming(null);
    try {
      await api.deleteNamespace(name);
      navigate('/');
      notify('Namespace deleted', `"${name}" and its entries are gone.`);
    } catch (err) {
      setError({ title: "Couldn't delete namespace", message: messageOf(err) });
    }
  }

  async function onCreateEntry(event: FormEvent) {
    event.preventDefault();
    setError(null);
    const created = entryName.trim();
    try {
      await api.createEntry(name, created, entryValue, entryDescription, entryEnvDependent);
      setEntryName('');
      setEntryValue('');
      setEntryDescription('');
      setEntryEnvDependent(false);
      await reloadAfterEntryChange();
      notify('Entry added', `"${created}" was created.`);
    } catch (err) {
      setError({ title: "Couldn't add entry", message: messageOf(err) });
    }
  }

  async function onSaveEntry(entry: string, edit: EntryEdit) {
    setError(null);
    setEditing(null);
    try {
      await api.updateEntry(name, entry, edit);
      await reloadAfterEntryChange();
      notify('Changes saved', `"${entry}" was updated.`);
    } catch (err) {
      setError({ title: "Couldn't save entry", message: messageOf(err) });
    }
  }

  async function onDeleteEntry(entry: string) {
    setError(null);
    setConfirming(null);
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
      notify('Entry deleted', `"${entry}" was removed.`);
    } catch (err) {
      setError({ title: "Couldn't delete entry", message: messageOf(err) });
    }
  }

  const crumb = (
    <Link className="crumb" to="/">
      <Icon name="arrowLeft" />
      Back to namespaces
    </Link>
  );

  if (loading) {
    return (
      <>
        {crumb}
        <p className="text-muted" role="status">
          Loading…
        </p>
      </>
    );
  }

  if (!namespace) {
    return (
      <>
        {crumb}
        {error && <ErrorBanner title={error.title} message={error.message} />}
      </>
    );
  }

  return (
    <>
      {crumb}

      <div className="page-head">
        <div>
          <h1>{namespace.name}</h1>
          <p className="sub">
            {namespace.description ? `${namespace.description} · ` : ''}
            Created {formatDate(namespace.created_at)} · Modified{' '}
            {formatDate(namespace.modified_at)}
          </p>
        </div>
        <button
          type="button"
          className="btn btn-secondary blueprint"
          aria-label={`Delete namespace ${namespace.name}`}
          onClick={() => setConfirming({ kind: 'namespace' })}
        >
          <Corners />
          Delete namespace
        </button>
      </div>

      {error && <ErrorBanner title={error.title} message={error.message} />}

      <section className="block">
        <h2>Namespace settings</h2>
        <div className="panel-row">
          <form className="panel blueprint" aria-label="Rename namespace" onSubmit={onRename}>
            <Corners />
            <div className="field">
              <label htmlFor="rename-namespace">New name</label>
              <input
                className="input"
                id="rename-namespace"
                value={renameTo}
                onChange={(event) => setRenameTo(event.target.value)}
              />
            </div>
            <button type="submit" className="btn btn-secondary">
              Rename
            </button>
          </form>

          <form
            className="panel blueprint"
            aria-label="Edit namespace description"
            onSubmit={onSaveDescription}
          >
            <Corners />
            <div className="field">
              <label htmlFor="namespace-description">Description (optional)</label>
              <input
                className="input"
                id="namespace-description"
                value={describeAs}
                onChange={(event) => setDescribeAs(event.target.value)}
              />
            </div>
            <button type="submit" className="btn btn-secondary">
              Save description
            </button>
          </form>
        </div>
      </section>

      <section className="block">
        <h2>Add entry</h2>
        <form className="panel blueprint" aria-label="Create entry" onSubmit={onCreateEntry}>
          <Corners />
          <div className="panel-row">
            <div className="field">
              <label htmlFor="entry-name">Entry name</label>
              <input
                className="input"
                id="entry-name"
                placeholder="stripe_secret_key"
                value={entryName}
                onChange={(event) => setEntryName(event.target.value)}
              />
            </div>
            <div className="field">
              <label htmlFor="entry-value">Entry value</label>
              <input
                className="input"
                id="entry-value"
                placeholder="sk_live_…"
                value={entryValue}
                onChange={(event) => setEntryValue(event.target.value)}
              />
            </div>
          </div>
          <div className="field" style={{ marginTop: 'var(--space-4)' }}>
            <label htmlFor="entry-description">Entry description (optional)</label>
            <input
              className="input"
              id="entry-description"
              placeholder="Used by the checkout service"
              value={entryDescription}
              onChange={(event) => setEntryDescription(event.target.value)}
            />
          </div>
          <label className="toolbar-check" style={{ marginTop: 'var(--space-3)' }}>
            <input
              id="entry-env-dependent"
              type="checkbox"
              checked={entryEnvDependent}
              onChange={(event) => setEntryEnvDependent(event.target.checked)}
            />
            Environment-dependent
          </label>
          <button type="submit" className="btn btn-primary blueprint">
            <Corners />
            Add entry
          </button>
        </form>
      </section>

      <section className="block">
        <h2>Entries</h2>

        <ListControls
          idPrefix="entry"
          label="entries"
          sortFields={ENTRY_SORT_FIELDS}
          pageSizes={PAGE_SIZES}
          query={query}
          onChange={updateQuery}
        />

        <label className="toolbar-check" htmlFor="filter-env-dependent">
          <input
            id="filter-env-dependent"
            type="checkbox"
            checked={query.env_dependent === true}
            onChange={(event) =>
              updateQuery({ env_dependent: event.target.checked ? true : undefined })
            }
          />
          Show only environment-dependent entries
        </label>

        {!entries ? (
          <TableSkeleton headers={COLUMNS} rows={3} />
        ) : entries.total_items === 0 ? (
          <EmptyState message={describeEmptyEntries(query)} />
        ) : (
          <>
            <div className="table-wrap">
              <table className="table">
                <thead>
                  <tr>
                    {COLUMNS.map((column) => (
                      <th key={column} className={column === 'Actions' ? 'col-actions' : undefined}>
                        {column}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {entries.items.map((entry) => (
                    <tr key={entry.name}>
                      <td>
                        <span className="name-link">{entry.name}</span>
                      </td>
                      <td className="entry-value">{entry.value}</td>
                      <td className="cell-desc">{entry.description}</td>
                      <td>
                        {entry.env_dependent ? (
                          <span className="tag tag-accent">Env-dependent</span>
                        ) : (
                          <span className="tag tag-neutral">—</span>
                        )}
                      </td>
                      <td className="cell-meta text-muted">
                        <DateCell iso={entry.modified_at} />
                      </td>
                      <td className="col-actions">
                        <span className="row-actions">
                          <button
                            type="button"
                            className="btn btn-secondary btn-icon icon-btn-sm"
                            aria-label={`Edit entry ${entry.name}`}
                            onClick={() => setEditing(entry)}
                          >
                            <Icon name="pencil" />
                          </button>
                          <button
                            type="button"
                            className="btn btn-secondary btn-icon icon-btn-sm"
                            aria-label={`Delete entry ${entry.name}`}
                            onClick={() => setConfirming({ kind: 'entry', name: entry.name })}
                          >
                            <Icon name="trash" />
                          </button>
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <Pagination
              label="entries"
              result={entries}
              onPage={(page) => setQuery((current) => ({ ...current, page }))}
            />
          </>
        )}
      </section>

      {editing && (
        <EntryEditDialog
          entry={editing}
          onCancel={() => setEditing(null)}
          onSave={(edit) => void onSaveEntry(editing.name, edit)}
        />
      )}

      {confirming?.kind === 'namespace' && (
        <ConfirmDialog
          title="Delete namespace?"
          confirmLabel="Delete"
          onCancel={() => setConfirming(null)}
          onConfirm={() => void onDeleteNamespace()}
        >
          This permanently deletes <strong>{namespace.name}</strong> and all of its entries. This
          can&rsquo;t be undone.
        </ConfirmDialog>
      )}

      {confirming?.kind === 'entry' && (
        <ConfirmDialog
          title="Delete entry?"
          confirmLabel="Delete"
          onCancel={() => setConfirming(null)}
          onConfirm={() => void onDeleteEntry(confirming.name)}
        >
          This permanently deletes the entry <strong>{confirming.name}</strong> from this namespace.
          This can&rsquo;t be undone.
        </ConfirmDialog>
      )}
    </>
  );
}

/** Explains an empty entry list in terms of the filters that produced it. */
function describeEmptyEntries(query: EntryListQuery): string {
  if (query.env_dependent === true) {
    return 'No environment-dependent entries.';
  }
  return query.name ? 'No entries match the filter.' : 'No entries yet.';
}
