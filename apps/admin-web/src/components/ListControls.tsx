import { useId, type ReactNode } from 'react';
import { PAGE_SIZES, isPageSize, type PageSize, type SortDirection } from '@okvns/shared';

export interface ListControlsValue {
  name: string;
  sort: string;
  direction: SortDirection;
  pageSize: PageSize;
}

export interface SortOption {
  value: string;
  label: string;
}

interface ListControlsProps {
  value: ListControlsValue;
  sortOptions: SortOption[];
  onChange: (next: ListControlsValue) => void;
  /** Extra controls (for example the environment-dependence filter). */
  children?: ReactNode;
}

/**
 * Filter, ordering and page-size controls. Every change is reported at once so
 * the page re-requests the list from the API; nothing is filtered locally.
 */
export function ListControls({ value, sortOptions, onChange, children }: ListControlsProps) {
  const id = useId();
  return (
    <div className="toolbar" role="group" aria-label="List controls">
      <div className="field grow">
        <label htmlFor={`${id}-name`}>Filter by name</label>
        <input
          id={`${id}-name`}
          className="input"
          type="text"
          value={value.name}
          onChange={(event) => onChange({ ...value, name: event.target.value })}
        />
      </div>
      <div className="field">
        <label htmlFor={`${id}-sort`}>Order by</label>
        <select
          id={`${id}-sort`}
          className="input"
          value={value.sort}
          onChange={(event) => onChange({ ...value, sort: event.target.value })}
        >
          {sortOptions.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>
      </div>
      <div className="field">
        <label htmlFor={`${id}-direction`}>Direction</label>
        <select
          id={`${id}-direction`}
          className="input"
          value={value.direction}
          onChange={(event) =>
            onChange({ ...value, direction: event.target.value as SortDirection })
          }
        >
          <option value="asc">Ascending</option>
          <option value="desc">Descending</option>
        </select>
      </div>
      <div className="field">
        <label htmlFor={`${id}-size`}>Per page</label>
        <select
          id={`${id}-size`}
          className="input"
          value={value.pageSize}
          onChange={(event) => {
            const size = Number(event.target.value);
            if (isPageSize(size)) {
              onChange({ ...value, pageSize: size });
            }
          }}
        >
          {PAGE_SIZES.map((size) => (
            <option key={size} value={size}>
              {size}
            </option>
          ))}
        </select>
      </div>
      {children}
    </div>
  );
}
