/**
 * Renders `created_at` / `modified_at` metadata as machine-readable `<time>`
 * elements. Values are ISO 8601 strings as returned by the API; they are shown
 * verbatim so the display stays deterministic and locale-independent.
 */
export function Timestamps({ createdAt, modifiedAt }: { createdAt: string; modifiedAt: string }) {
  return (
    <span className="timestamps">
      <span>
        Created <time dateTime={createdAt}>{createdAt}</time>
      </span>
      {' · '}
      <span>
        Modified <time dateTime={modifiedAt}>{modifiedAt}</time>
      </span>
    </span>
  );
}
