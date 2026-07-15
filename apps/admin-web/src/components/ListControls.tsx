import { SORT_DIRECTIONS, type PageSize, type SortDirection } from '@okvns/shared';

/** Human-facing wording for the sort fields the API accepts. */
const SORT_LABELS: Record<string, string> = {
  name: 'Name',
  created_at: 'Created',
  modified_at: 'Modified',
  env_dependent: 'Environment-dependent',
};

const DIRECTION_LABELS: Record<SortDirection, string> = {
  asc: 'Ascending',
  desc: 'Descending',
};

interface ListQueryState<S extends string> {
  page_size: PageSize;
  sort: S;
  direction: SortDirection;
  name?: string;
}

/**
 * Filter, ordering, and page-size controls shared by the namespace and entry
 * lists. Every change is reported to the parent, which re-requests the list from
 * the API — these controls never filter or sort already-fetched rows locally.
 *
 * `idPrefix` keeps element ids unique when two lists render on one page.
 */
export function ListControls<S extends string>({
  idPrefix,
  label,
  sortFields,
  pageSizes,
  query,
  onChange,
}: {
  idPrefix: string;
  label: string;
  sortFields: readonly S[];
  pageSizes: readonly PageSize[];
  query: ListQueryState<S>;
  onChange: (changes: Partial<ListQueryState<S>>) => void;
}) {
  return (
    <div className="toolbar" role="group" aria-label={`Filter and order ${label}`}>
      <div className="field grow">
        <label htmlFor={`${idPrefix}-filter-name`}>Filter by name</label>
        <input
          className="input"
          id={`${idPrefix}-filter-name`}
          placeholder={`Search ${label}…`}
          value={query.name ?? ''}
          onChange={(event) =>
            // A cleared box means "no filter", not "match the empty string".
            onChange({ name: event.target.value || undefined })
          }
        />
      </div>

      <div className="field">
        <label htmlFor={`${idPrefix}-sort`}>Order by</label>
        <select
          className="input"
          id={`${idPrefix}-sort`}
          value={query.sort}
          onChange={(event) => onChange({ sort: event.target.value as S })}
        >
          {sortFields.map((field) => (
            <option key={field} value={field}>
              {SORT_LABELS[field] ?? field}
            </option>
          ))}
        </select>
      </div>

      <div className="field">
        <label htmlFor={`${idPrefix}-direction`}>Direction</label>
        <select
          className="input"
          id={`${idPrefix}-direction`}
          value={query.direction}
          onChange={(event) => onChange({ direction: event.target.value as SortDirection })}
        >
          {SORT_DIRECTIONS.map((direction) => (
            <option key={direction} value={direction}>
              {DIRECTION_LABELS[direction]}
            </option>
          ))}
        </select>
      </div>

      <div className="field">
        <label htmlFor={`${idPrefix}-page-size`}>Per page</label>
        <select
          className="input"
          id={`${idPrefix}-page-size`}
          value={query.page_size}
          onChange={(event) => onChange({ page_size: Number(event.target.value) as PageSize })}
        >
          {pageSizes.map((size) => (
            <option key={size} value={size}>
              {size}
            </option>
          ))}
        </select>
      </div>
    </div>
  );
}
