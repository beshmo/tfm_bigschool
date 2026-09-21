import { useCallback, useEffect, useState, type FormEvent } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import type { EntryDto, EntrySortField, NamespaceDto } from '@okvns/shared';
import { useApi } from '../api/api-context';
import { toDisplayError, type DisplayError } from '../api/error-message';
import { Corners } from '../components/Blueprint';
import { ConfirmDialog } from '../components/ConfirmDialog';
import { EmptyState } from '../components/EmptyState';
import { EntryEditDialog } from '../components/EntryEditDialog';
import { ErrorBanner } from '../components/ErrorBanner';
import { Icon } from '../components/Icon';
import { ListControls, type ListControlsValue } from '../components/ListControls';
import { Pagination } from '../components/Pagination';
import { TableSkeleton } from '../components/TableSkeleton';
import { Timestamp } from '../components/Timestamps';
import { useToast } from '../components/Toast';
import { useList } from '../hooks/use-list';

const SORT_OPTIONS = [
  { value: 'name', label: 'Name' },
  { value: 'created_at', label: 'Created' },
  { value: 'modified_at', label: 'Modified' },
  { value: 'env_dependent', label: 'Environment-dependent' },
];
const HEADERS = ['Name', 'Value', 'Description', 'Environment', 'Created', 'Modified', ''];

/** Remounts on rename so every piece of state starts fresh for the new name. */
export function NamespaceDetailPage() {
  const { name = '' } = useParams();
  return <NamespaceDetail key={name} name={name} />;
}

type Pending = { kind: 'entry'; name: string } | { kind: 'namespace' };

function NamespaceDetail({ name }: { name: string }) {
  const api = useApi();
  const notify = useToast();
  const navigate = useNavigate();

  const [namespace, setNamespace] = useState<NamespaceDto>();
  const [loadError, setLoadError] = useState<DisplayError>();
  const [descriptionDraft, setDescriptionDraft] = useState('');
  const [newName, setNewName] = useState('');
  const [settingsError, setSettingsError] = useState<DisplayError>();

  const [entryName, setEntryName] = useState('');
  const [entryValue, setEntryValue] = useState('');
  const [entryDescription, setEntryDescription] = useState('');
  const [entryEnv, setEntryEnv] = useState(false);
  const [entryError, setEntryError] = useState<DisplayError>();

  const [controls, setControls] = useState<ListControlsValue>({
    name: '',
    sort: 'name',
    direction: 'asc',
    pageSize: 10,
  });
  const [envOnly, setEnvOnly] = useState(false);
  const [page, setPage] = useState(1);
  const [editing, setEditing] = useState<EntryDto>();
  const [pending, setPending] = useState<Pending>();
  const [deleting, setDeleting] = useState(false);
  const [deleteError, setDeleteError] = useState<DisplayError>();

  const refresh = useCallback(async () => {
    try {
      const loaded = await api.getNamespace(name);
      setNamespace(loaded);
      setDescriptionDraft(loaded.description ?? '');
      setLoadError(undefined);
    } catch (error) {
      setLoadError(toDisplayError(error));
    }
  }, [api, name]);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  const list = useList(
    () =>
      api.listEntries(name, {
        page,
        pageSize: controls.pageSize,
        sort: controls.sort as EntrySortField,
        direction: controls.direction,
        name: controls.name || undefined,
        envDependent: envOnly ? true : undefined,
      }),
    [api, name, page, controls, envOnly],
  );

  async function saveDescription(event: FormEvent) {
    event.preventDefault();
    setSettingsError(undefined);
    try {
      const updated = await api.updateNamespace(name, { description: descriptionDraft });
      setNamespace(updated);
      setDescriptionDraft(updated.description ?? '');
      notify('Changes saved');
    } catch (error) {
      setSettingsError(toDisplayError(error));
    }
  }

  async function rename(event: FormEvent) {
    event.preventDefault();
    setSettingsError(undefined);
    try {
      const updated = await api.updateNamespace(name, { name: newName });
      notify('Changes saved');
      navigate(`/namespaces/${encodeURIComponent(updated.name)}`, { replace: true });
    } catch (error) {
      setSettingsError(toDisplayError(error));
    }
  }

  async function addEntry(event: FormEvent) {
    event.preventDefault();
    setEntryError(undefined);
    try {
      await api.createEntry(name, {
        name: entryName,
        value: entryValue,
        description: entryDescription === '' ? undefined : entryDescription,
        env_dependent: entryEnv,
      });
      notify('Entry added');
      setEntryName('');
      setEntryValue('');
      setEntryDescription('');
      setEntryEnv(false);
      list.reload();
      void refresh();
    } catch (error) {
      setEntryError(toDisplayError(error));
    }
  }

  async function confirmDelete() {
    if (!pending) return;
    setDeleting(true);
    setDeleteError(undefined);
    try {
      if (pending.kind === 'namespace') {
        await api.deleteNamespace(name);
        notify('Namespace deleted');
        navigate('/');
        return;
      }
      await api.deleteEntry(name, pending.name);
      notify('Entry deleted');
      if (list.result?.items.length === 1 && page > 1) {
        setPage(page - 1);
      }
      list.reload();
      void refresh();
    } catch (error) {
      setDeleteError(toDisplayError(error));
    } finally {
      setDeleting(false);
      setPending(undefined);
    }
  }

  if (!namespace) {
    return (
      <>
        <Link className="crumb" to="/">
          <Icon name="arrowLeft" />
          Namespaces
        </Link>
        {loadError ? (
          <ErrorBanner error={loadError} />
        ) : (
          <p className="text-muted" role="status">
            Loading…
          </p>
        )}
      </>
    );
  }

  const items = list.result?.items;
  const filtering = controls.name !== '' || envOnly;

  return (
    <>
      <Link className="crumb" to="/">
        <Icon name="arrowLeft" />
        Namespaces
      </Link>
      <div className="page-head">
        <div>
          <h1>{namespace.name}</h1>
          <p className="sub">{namespace.description ?? 'No description.'}</p>
          <p className="text-muted cell-meta">
            Created <Timestamp value={namespace.created_at} /> · Modified{' '}
            <Timestamp value={namespace.modified_at} />
          </p>
        </div>
        <button
          type="button"
          className="btn btn-secondary"
          aria-label={`Delete namespace ${namespace.name}`}
          onClick={() => setPending({ kind: 'namespace' })}
        >
          <Icon name="trash" />
          Delete
        </button>
      </div>

      <section className="block">
        <h2>Namespace settings</h2>
        <div className="panel blueprint">
          <Corners />
          {settingsError ? <ErrorBanner error={settingsError} /> : null}
          <div className="panel-row">
            <form onSubmit={saveDescription} aria-label="Description">
              <div className="field">
                <label htmlFor="settings-description">Description (optional)</label>
                <textarea
                  id="settings-description"
                  className="input"
                  value={descriptionDraft}
                  onChange={(event) => setDescriptionDraft(event.target.value)}
                />
              </div>
              <button type="submit" className="btn btn-secondary">
                Save description
              </button>
            </form>
            <form onSubmit={rename} aria-label="Rename">
              <div className="field">
                <label htmlFor="settings-new-name">New name</label>
                <input
                  id="settings-new-name"
                  className="input"
                  value={newName}
                  onChange={(event) => setNewName(event.target.value)}
                />
              </div>
              <button type="submit" className="btn btn-secondary">
                Rename
              </button>
            </form>
          </div>
        </div>
      </section>

      <section className="block">
        <h2>Add entry</h2>
        <form className="panel blueprint" aria-label="Add entry" onSubmit={addEntry}>
          <Corners />
          {entryError ? <ErrorBanner error={entryError} /> : null}
          <div className="panel-row">
            <div className="field">
              <label htmlFor="entry-name">Entry name</label>
              <input
                id="entry-name"
                className="input"
                value={entryName}
                onChange={(event) => setEntryName(event.target.value)}
              />
            </div>
            <div className="field">
              <label htmlFor="entry-value">Entry value</label>
              <input
                id="entry-value"
                className="input"
                value={entryValue}
                onChange={(event) => setEntryValue(event.target.value)}
              />
            </div>
            <div className="field">
              <label htmlFor="entry-description">Entry description (optional)</label>
              <input
                id="entry-description"
                className="input"
                value={entryDescription}
                onChange={(event) => setEntryDescription(event.target.value)}
              />
            </div>
            <label className="toolbar-check" htmlFor="entry-env">
              <input
                id="entry-env"
                type="checkbox"
                checked={entryEnv}
                onChange={(event) => setEntryEnv(event.target.checked)}
              />
              Environment-dependent
            </label>
          </div>
          <button type="submit" className="btn btn-primary blueprint">
            <Corners />
            Add entry
          </button>
        </form>
      </section>

      <section className="block" aria-label="Entry list">
        <h2>Entries</h2>
        <ListControls
          value={controls}
          sortOptions={SORT_OPTIONS}
          onChange={(next) => {
            setControls(next);
            setPage(1);
          }}
        >
          <label className="toolbar-check" htmlFor="entry-env-filter">
            <input
              id="entry-env-filter"
              type="checkbox"
              checked={envOnly}
              onChange={(event) => {
                setEnvOnly(event.target.checked);
                setPage(1);
              }}
            />
            Show only environment-dependent entries
          </label>
        </ListControls>
        {deleteError ? <ErrorBanner error={deleteError} /> : null}
        {list.error ? <ErrorBanner error={list.error} /> : null}
        {list.loading ? (
          <p className="text-muted" role="status">
            Loading…
          </p>
        ) : null}
        {items === undefined ? (
          list.loading ? (
            <TableSkeleton headers={HEADERS} />
          ) : null
        ) : items.length === 0 ? (
          filtering ? (
            <EmptyState title="No entries match the filter." />
          ) : (
            <EmptyState title="No entries yet." hint="Add one above to get started." />
          )
        ) : (
          <div className="table-wrap">
            <table className="table">
              <thead>
                <tr>
                  {HEADERS.map((header, index) => (
                    <th key={index}>{header}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {items.map((entry) => (
                  <tr key={entry.name}>
                    <td>
                      <span className="name-link">{entry.name}</span>
                    </td>
                    <td className="entry-value">{entry.value}</td>
                    <td className="cell-desc">{entry.description ?? ''}</td>
                    <td>
                      {entry.env_dependent ? (
                        <span className="tag tag-outline">Needs adjustment per environment</span>
                      ) : null}
                    </td>
                    <td className="cell-meta">
                      <Timestamp value={entry.created_at} />
                    </td>
                    <td className="cell-meta">
                      <Timestamp value={entry.modified_at} />
                    </td>
                    <td className="col-actions">
                      <div className="row-actions">
                        <button
                          type="button"
                          className="btn btn-secondary icon-btn-sm"
                          aria-label={`Edit entry ${entry.name}`}
                          onClick={() => setEditing(entry)}
                        >
                          <Icon name="pencil" />
                        </button>
                        <button
                          type="button"
                          className="btn btn-secondary icon-btn-sm"
                          aria-label={`Delete entry ${entry.name}`}
                          onClick={() => setPending({ kind: 'entry', name: entry.name })}
                        >
                          <Icon name="trash" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
        {list.result ? (
          <Pagination
            page={list.result.page}
            totalPages={list.result.total_pages}
            totalItems={list.result.total_items}
            onPageChange={setPage}
          />
        ) : null}
      </section>

      {editing ? (
        <EntryEditDialog
          entry={editing}
          onClose={() => setEditing(undefined)}
          onSave={async (input) => {
            await api.updateEntry(name, editing.name, input);
            setEditing(undefined);
            notify('Changes saved');
            list.reload();
            void refresh();
          }}
        />
      ) : null}

      {pending ? (
        <ConfirmDialog
          title={pending.kind === 'namespace' ? 'Delete namespace?' : 'Delete entry?'}
          busy={deleting}
          onConfirm={confirmDelete}
          onCancel={() => setPending(undefined)}
        >
          {pending.kind === 'namespace'
            ? `This permanently deletes "${namespace.name}" and all of its entries.`
            : `This permanently deletes the entry "${pending.name}".`}
        </ConfirmDialog>
      ) : null}
    </>
  );
}
