const PLACEHOLDER_ROWS = 4;

/** A loading placeholder that shows the real table headers above four bar rows. */
export function TableSkeleton({ headers }: { headers: string[] }) {
  return (
    <div className="table-wrap" aria-hidden="true">
      <table className="table">
        <thead>
          <tr>
            {headers.map((header) => (
              <th key={header}>{header}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {Array.from({ length: PLACEHOLDER_ROWS }, (_, row) => (
            <tr key={row} className="skeleton-row">
              {headers.map((header) => (
                <td key={header}>
                  <span className="skeleton-bar" />
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
