import { useState, type FormEvent } from 'react';
import { Link } from 'react-router-dom';
import type { NamespaceSortField } from '@okvns/shared';
import { useApi } from '../api/api-context';
import { toDisplayError, type DisplayError } from '../api/error-message';
import { Corners } from '../components/Blueprint';
import { ConfirmDialog } from '../components/ConfirmDialog';
import { EmptyState } from '../components/EmptyState';
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
];
const HEADERS = ['Name', 'Description', 'Created', 'Modified', ''];

export function NamespacesPage() {
  const api = useApi();
  const notify = useToast();
  const [controls, setControls] = useState<ListControlsValue>({
    name: '',
    sort: 'name',
    direction: 'asc',
    pageSize: 10,
  });
  const [page, setPage] = useState(1);
  const list = useList(
    () =>
      api.listNamespaces({
        page,
        pageSize: controls.pageSize,
        sort: controls.sort as NamespaceSortField,
        direction: controls.direction,
        name: controls.name || undefined,
      }),
    [api, page, controls],
  );

  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [creating, setCreating] = useState(false);
  const [createError, setCreateError] = useState<DisplayError>();
  const [pendingDelete, setPendingDelete] = useState<string>();
  const [deleting, setDeleting] = useState(false);
  const [deleteError, setDeleteError] = useState<DisplayError>();

  async function create(event: FormEvent) {
    event.preventDefault();
    setCreating(true);
    setCreateError(undefined);
    try {
      await api.createNamespace({
        name,
        description: description === '' ? undefined : description,
      });
      notify('Namespace created');
      setName('');
      setDescription('');
      setPage(1);
      list.reload();
    } catch (error) {
      setCreateError(toDisplayError(error));
    } finally {
      setCreating(false);
    }
  }

  async function confirmDelete() {
    if (!pendingDelete) return;
    setDeleting(true);
    setDeleteError(undefined);
    try {
      await api.deleteNamespace(pendingDelete);
      notify('Namespace deleted');
      // Deleting the last row of a page goes back one page.
      if (list.result?.items.length === 1 && page > 1) {
        setPage(page - 1);
      }
      list.reload();
    } catch (error) {
      setDeleteError(toDisplayError(error));
    } finally {
      setDeleting(false);
      setPendingDelete(undefined);
    }
  }

  const items = list.result?.items;
  const filtering = controls.name !== '';

  return (
    <>
      <div className="page-head">
        <div>
          <h1>Namespaces</h1>
          <p className="sub">Group related key-value entries under a named namespace.</p>
        </div>
      </div>

      <section className="block">
        <h2>Create namespace</h2>
        <form className="panel blueprint" aria-label="Create namespace" onSubmit={create}>
          <Corners />
          {createError ? <ErrorBanner error={createError} /> : null}
          <div className="panel-row">
            <div className="field">
              <label htmlFor="namespace-name">Namespace name</label>
              <input
                id="namespace-name"
                className="input"
                value={name}
                onChange={(event) => setName(event.target.value)}
              />
            </div>
            <div className="field">
              <label htmlFor="namespace-description">Description (optional)</label>
              <input
                id="namespace-description"
                className="input"
                value={description}
                onChange={(event) => setDescription(event.target.value)}
              />
            </div>
          </div>
          <button type="submit" className="btn btn-primary blueprint" disabled={creating}>
            <Corners />
            Create namespace
          </button>
        </form>
      </section>

      <section className="block" aria-label="Namespace list">
        <ListControls
          value={controls}
          sortOptions={SORT_OPTIONS}
          onChange={(next) => {
            setControls(next);
            setPage(1);
          }}
        />
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
            <EmptyState title="No namespaces match the filter." />
          ) : (
            <EmptyState title="No namespaces yet." hint="Create one above to get started." />
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
                {items.map((item) => (
                  <tr key={item.name}>
                    <td>
                      <Link
                        className="name-link"
                        to={`/namespaces/${encodeURIComponent(item.name)}`}
                      >
                        {item.name}
                      </Link>
                    </td>
                    <td className="cell-desc">{item.description ?? ''}</td>
                    <td className="cell-meta">
                      <Timestamp value={item.created_at} />
                    </td>
                    <td className="cell-meta">
                      <Timestamp value={item.modified_at} />
                    </td>
                    <td className="col-actions">
                      <div className="row-actions">
                        <button
                          type="button"
                          className="btn btn-secondary icon-btn-sm"
                          aria-label={`Delete namespace ${item.name}`}
                          onClick={() => setPendingDelete(item.name)}
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

      {pendingDelete ? (
        <ConfirmDialog
          title="Delete namespace?"
          busy={deleting}
          onConfirm={confirmDelete}
          onCancel={() => setPendingDelete(undefined)}
        >
          {`This permanently deletes "${pendingDelete}" and all of its entries.`}
        </ConfirmDialog>
      ) : null}
    </>
  );
}
