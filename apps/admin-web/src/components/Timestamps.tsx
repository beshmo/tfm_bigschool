/**
 * Dates render through one formatter pinned to `en-US` and UTC, so the output
 * is identical on every machine (tests and E2E rely on that), while
 * `<time dateTime>` keeps the API's exact ISO instant.
 */
const formatter = new Intl.DateTimeFormat('en-US', {
  timeZone: 'UTC',
  year: 'numeric',
  month: 'short',
  day: 'numeric',
  hour: '2-digit',
  minute: '2-digit',
  hour12: false,
});

export function formatTimestamp(iso: string): string {
  const date = new Date(iso);
  return Number.isNaN(date.getTime()) ? iso : `${formatter.format(date)} UTC`;
}

export function Timestamp({ value }: { value: string }) {
  return <time dateTime={value}>{formatTimestamp(value)}</time>;
}
