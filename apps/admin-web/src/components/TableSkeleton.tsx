/** Pixel widths the placeholder bars cycle through, so rows look uneven like real data. */
const WIDTHS = [120, 170, 90, 140, 200, 110, 160];

/**
 * Placeholder rows shown while a list is loading.
 *
 * The skeleton keeps the real table's header and column count so the layout
 * does not jump when rows arrive. It is `aria-hidden` and paired with a visible
 * status message: bars convey nothing to a screen reader, and animating
 * gibberish into the accessibility tree is worse than a plain "Loading…".
 */
export function TableSkeleton({
  headers,
  rows = 4,
}: {
  headers: readonly string[];
  rows?: number;
}) {
  return (
    <>
      <p className="text-muted" role="status">
        Loading…
      </p>
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
            {Array.from({ length: rows }, (_, row) => (
              <tr key={row} className="skeleton-row">
                {headers.map((header, column) => (
                  <td key={header}>
                    {/* The trailing actions column stays empty, as in the mockups. */}
                    {column < headers.length - 1 && (
                      <span
                        className="skeleton-bar"
                        style={{ width: WIDTHS[(row * headers.length + column) % WIDTHS.length] }}
                      />
                    )}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </>
  );
}
