import type { PaginatedResultDto } from '@okvns/shared';
import { Icon } from './Icon';

/**
 * Page navigation driven entirely by the API's pagination metadata — the page
 * count and totals come from the server, never from counting fetched rows.
 */
export function Pagination<T>({
  label,
  result,
  onPage,
}: {
  label: string;
  result: PaginatedResultDto<T>;
  onPage: (page: number) => void;
}) {
  const { page, total_pages: totalPages, total_items: totalItems } = result;
  return (
    <nav className="pagination" aria-label={`${label} pagination`}>
      <span className="count">
        Page {page} of {totalPages} ({totalItems} total)
      </span>
      <div className="btns">
        <button
          type="button"
          className="btn btn-secondary"
          aria-label={`Previous page of ${label}`}
          disabled={page <= 1}
          onClick={() => onPage(page - 1)}
        >
          <Icon name="chevronLeft" />
          Previous
        </button>
        <button
          type="button"
          className="btn btn-secondary"
          aria-label={`Next page of ${label}`}
          disabled={page >= totalPages}
          onClick={() => onPage(page + 1)}
        >
          Next
          <Icon name="chevronRight" />
        </button>
      </div>
    </nav>
  );
}
