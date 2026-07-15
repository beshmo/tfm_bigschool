import type { PaginatedResultDto } from '@okvns/shared';

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
    <nav aria-label={`${label} pagination`}>
      <button
        type="button"
        aria-label={`Previous page of ${label}`}
        disabled={page <= 1}
        onClick={() => onPage(page - 1)}
      >
        Previous
      </button>
      <span>
        Page {page} of {totalPages} ({totalItems} total)
      </span>
      <button
        type="button"
        aria-label={`Next page of ${label}`}
        disabled={page >= totalPages}
        onClick={() => onPage(page + 1)}
      >
        Next
      </button>
    </nav>
  );
}
