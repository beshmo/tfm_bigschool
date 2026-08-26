/**
 * The date format the design specifies ("Jul 2, 2026").
 *
 * Locale and time zone are pinned rather than taken from the viewer: the
 * rendered text stays identical on every machine, which is what keeps the unit
 * and E2E suites deterministic. The `<time dateTime>` attribute still carries
 * the API's exact ISO 8601 instant for machines.
 */
const DATE_FORMAT = new Intl.DateTimeFormat('en-US', {
  year: 'numeric',
  month: 'short',
  day: 'numeric',
  timeZone: 'UTC',
});

/** Formats an ISO 8601 timestamp for display, passing unparseable input through. */
export function formatDate(iso: string): string {
  const parsed = new Date(iso);
  return Number.isNaN(parsed.getTime()) ? iso : DATE_FORMAT.format(parsed);
}

/** A single API timestamp as a machine-readable, human-formatted `<time>`. */
export function DateCell({ iso }: { iso: string }) {
  return <time dateTime={iso}>{formatDate(iso)}</time>;
}

/** Renders `created_at` / `modified_at` metadata as a single inline summary. */
export function Timestamps({ createdAt, modifiedAt }: { createdAt: string; modifiedAt: string }) {
  return (
    <span className="timestamps">
      <span>
        Created <DateCell iso={createdAt} />
      </span>
      {' · '}
      <span>
        Modified <DateCell iso={modifiedAt} />
      </span>
    </span>
  );
}
