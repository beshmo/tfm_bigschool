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
import { ErrorBanner } from '../components/ErrorBanner';
import { Timestamps } from '../components/Timestamps';
import { ListControls } from '../components/ListControls';
import { Pagination } from '../components/Pagination';

const INITIAL_QUERY: NamespaceListQuery = {
  page: 1,
  page_size: 10,
  sort: 'name',
  direction: 'asc',
};

export function NamespacesPage() {
  const api = useApi();
  const [query, setQuery] = useState<NamespaceListQuery>(INITIAL_QUERY);
  const [result, setResult] = useState<PaginatedResultDto<NamespaceListItemDto> | null>(null);
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  const reload = useCallback(async () => {
    try {
      setResult(await api.listNamespaces(query));
    } catch (err) {
      setError(messageOf(err));
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

      <ListControls
        idPrefix="namespace"
        label="namespaces"
        sortFields={NAMESPACE_SORT_FIELDS}
        pageSizes={PAGE_SIZES}
        query={query}
        onChange={updateQuery}
      />

      {loading ? (
        <p>Loading…</p>
      ) : !result || result.total_items === 0 ? (
        <p>{query.name ? 'No namespaces match the filter.' : 'No namespaces yet.'}</p>
      ) : (
        <>
          <ul>
            {result.items.map((namespace) => (
              <li key={namespace.name}>
                <Link to={`/namespaces/${encodeURIComponent(namespace.name)}`}>
                  {namespace.name}
                </Link>
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
          <Pagination
            label="namespaces"
            result={result}
            onPage={(page) => setQuery((current) => ({ ...current, page }))}
          />
        </>
      )}
    </section>
  );
}
