import { useCallback, useEffect, useState, type FormEvent } from 'react';
import { Link } from 'react-router-dom';
import {
  NAMESPACE_SORT_FIELDS,
  PAGE_SIZES,
  type NamespaceListItemDto,
  type NamespaceListQuery,
  type PaginatedResultDto,
} from '@okvns/shared';
import { useApi } from '../api/api-context';
import { messageOf } from '../api/error-message';
import { Corners } from '../components/Blueprint';
import { ConfirmDialog } from '../components/ConfirmDialog';
import { EmptyState } from '../components/EmptyState';
import { ErrorBanner } from '../components/ErrorBanner';
import { Icon } from '../components/Icon';
import { ListControls } from '../components/ListControls';
import { Pagination } from '../components/Pagination';
import { TableSkeleton } from '../components/TableSkeleton';
import { DateCell } from '../components/Timestamps';
import { useToast } from '../components/Toast';

const INITIAL_QUERY: NamespaceListQuery = {
  page: 1,
  page_size: 10,
  sort: 'name',
  direction: 'asc',
};

const COLUMNS = ['Name', 'Description', 'Created', 'Modified', 'Actions'] as const;

export function NamespacesPage() {
  const api = useApi();
  const notify = useToast();
  const [query, setQuery] = useState<NamespaceListQuery>(INITIAL_QUERY);
  const [result, setResult] = useState<PaginatedResultDto<NamespaceListItemDto> | null>(null);
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [error, setError] = useState<{ title: string; message: string } | null>(null);
  const [loading, setLoading] = useState(true);
  /** The namespace awaiting delete confirmation, or null when no dialog is open. */
  const [pendingDelete, setPendingDelete] = useState<string | null>(null);

  const reload = useCallback(async () => {
    try {
      setResult(await api.listNamespaces(query));
    } catch (err) {
      setError({ title: "Couldn't load namespaces", message: messageOf(err) });
    } finally {
      setLoading(false);
    }
  }, [api, query]);

  useEffect(() => {
    void reload();
  }, [reload]);

  /**
   * Applies a query change. Anything that reshapes the result set sends the
   * admin back to the first page, since the page they were on may not exist
   * under the new query.
   */
  function updateQuery(changes: Partial<NamespaceListQuery>) {
    setQuery((current) => ({ ...current, page: 1, ...changes }));
  }

  async function onCreate(event: FormEvent) {
    event.preventDefault();
    setError(null);
    const created = name.trim();
    try {
      await api.createNamespace(created, description);
      setName('');
      setDescription('');
      await reload();
      notify('Namespace created', `"${created}" is ready to use.`);
    } catch (err) {
      setError({ title: "Couldn't create namespace", message: messageOf(err) });
    }
  }

  async function onDelete(target: string) {
    setError(null);
    setPendingDelete(null);
    try {
      await api.deleteNamespace(target);
      // Deleting the last namespace on a trailing page would otherwise strand
      // the admin on a page that no longer exists, so step back to the last
      // page that still has rows.
      const remaining = (result?.total_items ?? 1) - 1;
      const lastPage = Math.max(1, Math.ceil(remaining / query.page_size));
      if (query.page > lastPage) {
        setQuery((current) => ({ ...current, page: lastPage }));
      } else {
        await reload();
      }
      notify('Namespace deleted', `"${target}" and its entries are gone.`);
    } catch (err) {
      setError({ title: "Couldn't delete namespace", message: messageOf(err) });
    }
  }

  return (
    <>
      <div className="page-head">
        <div>
          <h1>Namespaces</h1>
          <p className="sub">
            {result ? `${result.total_items} namespaces · ` : ''}
            Key/value stores grouped by service
          </p>
        </div>
      </div>

      <section className="block">
        <h2>Create namespace</h2>
        <form className="panel blueprint" aria-label="Create namespace" onSubmit={onCreate}>
          <Corners />
          <div className="panel-row">
            <div className="field">
              <label htmlFor="namespace-name">Namespace name</label>
              <input
                className="input"
                id="namespace-name"
                placeholder="billing-service"
                value={name}
                onChange={(event) => setName(event.target.value)}
              />
            </div>
            <div className="field">
              <label htmlFor="namespace-description">Description (optional)</label>
              <input
                className="input"
                id="namespace-description"
                placeholder="Config for the billing service"
                value={description}
                onChange={(event) => setDescription(event.target.value)}
              />
            </div>
          </div>
          <button type="submit" className="btn btn-primary blueprint">
            <Corners />
            Create namespace
          </button>
        </form>
      </section>

      {error && <ErrorBanner title={error.title} message={error.message} />}

      <section className="block">
        <ListControls
          idPrefix="namespace"
          label="namespaces"
          sortFields={NAMESPACE_SORT_FIELDS}
          pageSizes={PAGE_SIZES}
          query={query}
          onChange={updateQuery}
        />

        {loading ? (
          <TableSkeleton headers={COLUMNS} />
        ) : !result || result.total_items === 0 ? (
          <EmptyState
            message={query.name ? 'No namespaces match the filter.' : 'No namespaces yet.'}
            hint={query.name ? undefined : 'Create one above to get started.'}
          />
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
                  {result.items.map((namespace) => (
                    <tr key={namespace.name}>
                      <td>
                        <Link
                          className="name-link"
                          to={`/namespaces/${encodeURIComponent(namespace.name)}`}
                        >
                          {namespace.name}
                        </Link>
                      </td>
                      <td className="cell-desc">{namespace.description}</td>
                      <td className="cell-meta text-muted">
                        <DateCell iso={namespace.created_at} />
                      </td>
                      <td className="cell-meta text-muted">
                        <DateCell iso={namespace.modified_at} />
                      </td>
                      <td className="col-actions">
                        <button
                          type="button"
                          className="btn btn-secondary btn-icon icon-btn-sm"
                          aria-label={`Delete namespace ${namespace.name}`}
                          onClick={() => setPendingDelete(namespace.name)}
                        >
                          <Icon name="trash" />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <Pagination
              label="namespaces"
              result={result}
              onPage={(page) => setQuery((current) => ({ ...current, page }))}
            />
          </>
        )}
      </section>

      {pendingDelete && (
        <ConfirmDialog
          title="Delete namespace?"
          confirmLabel="Delete"
          onCancel={() => setPendingDelete(null)}
          onConfirm={() => void onDelete(pendingDelete)}
        >
          This permanently deletes <strong>{pendingDelete}</strong> and all of its entries. This
          can&rsquo;t be undone.
        </ConfirmDialog>
      )}
    </>
  );
}
