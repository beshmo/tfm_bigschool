import { type NamespaceDto } from '@okvns/shared';
import { normalizeDescription } from './description.js';
import { DuplicateEntryError, EntryNotFoundError } from './errors.js';
import { Entry } from './entry.js';
import { ResourceName } from './resource-name.js';

/** Current wall-clock time as an ISO 8601 string. */
const nowIso = (): string => new Date().toISOString();

/**
 * Namespace aggregate. Owns a uniquely-named collection of entries and enforces
 * entry-name uniqueness within itself. Entries are listed in deterministic
 * name order.
 *
 * Namespaces carry an optional description plus creation and
 * aggregate-modification timestamps: `modifiedAt` reflects the last
 * namespace-level change (rename, description change) or entry mutation. Any
 * entry-collection mutation refreshes `modifiedAt`; repositories own final
 * timestamp assignment via `stamp` and rehydration.
 */
export class Namespace {
  private readonly entriesByName = new Map<string, Entry>();

  private constructor(
    private currentName: string,
    private currentDescription: string | undefined,
    private _createdAt: string,
    private _modifiedAt: string,
  ) {}

  static create(name: unknown, description?: unknown): Namespace {
    const timestamp = nowIso();
    const resourceName = ResourceName.create(name);
    return new Namespace(
      resourceName.value,
      normalizeDescription(description, resourceName.value),
      timestamp,
      timestamp,
    );
  }

  /** Rebuilds a namespace from stored state, preserving its timestamps and
   * entries without treating them as fresh mutations. */
  static rehydrate(
    name: unknown,
    createdAt: string,
    modifiedAt: string,
    entries: Entry[],
    description?: unknown,
  ): Namespace {
    const namespace = Namespace.create(name, description);
    for (const entry of entries) {
      namespace.entriesByName.set(entry.name, entry);
    }
    namespace._createdAt = createdAt;
    namespace._modifiedAt = modifiedAt;
    return namespace;
  }

  get name(): string {
    return this.currentName;
  }

  get description(): string | undefined {
    return this.currentDescription;
  }

  get createdAt(): string {
    return this._createdAt;
  }

  get modifiedAt(): string {
    return this._modifiedAt;
  }

  /** Refreshes the aggregate modification timestamp. */
  private touch(): void {
    this._modifiedAt = nowIso();
  }

  /** Overwrites the namespace timestamps (used by repositories when
   * persisting). Entry timestamps are stamped independently. */
  stamp(createdAt: string, modifiedAt: string): void {
    this._createdAt = createdAt;
    this._modifiedAt = modifiedAt;
  }

  rename(name: unknown): void {
    this.currentName = ResourceName.create(name).value;
    this.touch();
  }

  /** Replaces the namespace description. Blank input clears it. Either way this
   * is a namespace-level change, so `modifiedAt` moves forward. */
  describe(description: unknown): void {
    this.currentDescription = normalizeDescription(description, this.currentName);
    this.touch();
  }

  addEntry(entry: Entry): void {
    if (this.entriesByName.has(entry.name)) {
      throw new DuplicateEntryError(this.currentName, entry.name);
    }
    this.entriesByName.set(entry.name, entry);
    this.touch();
  }

  hasEntry(name: string): boolean {
    return this.entriesByName.has(name);
  }

  getEntry(name: string): Entry {
    const entry = this.entriesByName.get(name);
    if (!entry) {
      throw new EntryNotFoundError(this.currentName, name);
    }
    return entry;
  }

  removeEntry(name: string): void {
    if (!this.entriesByName.delete(name)) {
      throw new EntryNotFoundError(this.currentName, name);
    }
    this.touch();
  }

  replaceEntry(originalName: string, entry: Entry): void {
    const original = this.entriesByName.get(originalName);
    if (!original) {
      throw new EntryNotFoundError(this.currentName, originalName);
    }
    if (entry.name !== originalName && this.entriesByName.has(entry.name)) {
      throw new DuplicateEntryError(this.currentName, entry.name);
    }
    // An update targets the same logical entry, so its creation time is
    // preserved even when the name changes; only `modifiedAt` moves forward.
    entry.stamp(original.createdAt, entry.modifiedAt);
    this.entriesByName.delete(originalName);
    this.entriesByName.set(entry.name, entry);
    this.touch();
  }

  /** Replaces every entry atomically; rejects duplicate names in the input. */
  setEntries(entries: Entry[]): void {
    const next = new Map<string, Entry>();
    for (const entry of entries) {
      if (next.has(entry.name)) {
        throw new DuplicateEntryError(this.currentName, entry.name);
      }
      next.set(entry.name, entry);
    }
    this.entriesByName.clear();
    for (const [key, entry] of next) {
      this.entriesByName.set(key, entry);
    }
  }

  listEntries(): Entry[] {
    return [...this.entriesByName.values()].sort((a, b) => compareNames(a.name, b.name));
  }

  /** Deep copy with independent entry instances, preserving all timestamps. */
  clone(): Namespace {
    const entries = this.listEntries().map((entry) =>
      Entry.rehydrate(
        entry.name,
        entry.value,
        entry.createdAt,
        entry.modifiedAt,
        entry.description,
      ),
    );
    return Namespace.rehydrate(
      this.currentName,
      this._createdAt,
      this._modifiedAt,
      entries,
      this.currentDescription,
    );
  }

  toDto(): NamespaceDto {
    return {
      name: this.currentName,
      ...(this.currentDescription === undefined ? {} : { description: this.currentDescription }),
      created_at: this._createdAt,
      modified_at: this._modifiedAt,
      entries: this.listEntries().map((entry) => entry.toDto()),
    };
  }
}

/** Deterministic, locale-independent name ordering. */
export function compareNames(a: string, b: string): number {
  if (a < b) return -1;
  if (a > b) return 1;
  return 0;
}
