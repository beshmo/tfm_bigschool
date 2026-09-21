import { Icon } from './Icon';

interface PaginationProps {
  page: number;
  totalPages: number;
  totalItems: number;
  onPageChange: (page: number) => void;
}

export function Pagination({ page, totalPages, totalItems, onPageChange }: PaginationProps) {
  const lastPage = Math.max(totalPages, 1);
  return (
    <nav className="pagination" aria-label="Pagination">
      <span className="count">
        Page {page} of {lastPage} ({totalItems} total)
      </span>
      <div className="btns">
        <button
          type="button"
          className="btn btn-secondary btn-icon"
          aria-label="Previous page"
          disabled={page <= 1}
          onClick={() => onPageChange(page - 1)}
        >
          <Icon name="chevronLeft" />
        </button>
        <button
          type="button"
          className="btn btn-secondary btn-icon"
          aria-label="Next page"
          disabled={page >= lastPage}
          onClick={() => onPageChange(page + 1)}
        >
          <Icon name="chevronRight" />
        </button>
      </div>
    </nav>
  );
}
