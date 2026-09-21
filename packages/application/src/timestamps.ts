import type { Entry, Namespace } from '@okvns/domain';

function sameEntries(previous: Namespace, next: Namespace): boolean {
  return (
    previous.entries.length === next.entries.length &&
    next.entries.every((entry) => {
      const before = previous.entries.find((candidate) => candidate.name === entry.name);
      return before !== undefined && before.hasSameContent(entry);
    })
  );
}

function isUnchanged(previous: Namespace, next: Namespace): boolean {
  return (
    previous.name === next.name &&
    previous.description === next.description &&
    sameEntries(previous, next)
  );
}

function stampEntry(previous: Namespace | undefined, entry: Entry, now: Date): Entry {
  const before = previous?.entries.find((candidate) => candidate.name === entry.name);
  if (before?.hasSameContent(entry)) {
    return entry.withTimestamps(before.createdAt, before.modifiedAt);
  }
  return entry.withTimestamps(before?.createdAt ?? entry.createdAt ?? now, now);
}

/**
 * Applies the timestamp rules for a write, for repositories that own timestamps
 * in application memory: `createdAt` is set once and never changes; an entry's
 * `modifiedAt` moves only when its content changes; a namespace's `modifiedAt`
 * moves on any namespace-level change or entry mutation.
 */
export function stampNamespace(
  previous: Namespace | undefined,
  next: Namespace,
  now: Date,
): Namespace {
  const entries = next.entries.map((entry) => stampEntry(previous, entry, now));
  const modifiedAt = previous && isUnchanged(previous, next) ? (previous.modifiedAt ?? now) : now;
  return next
    .replaceEntries(entries)
    .withTimestamps(previous?.createdAt ?? next.createdAt ?? now, modifiedAt);
}
