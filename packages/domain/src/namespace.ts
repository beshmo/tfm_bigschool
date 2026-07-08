import { type NamespaceDto } from '@okvns/shared';
import { DuplicateEntryError, EntryNotFoundError } from './errors.js';
import { Entry } from './entry.js';
import { ResourceName } from './resource-name.js';

/**
 * Namespace aggregate. Owns a uniquely-named collection of entries and enforces
 * entry-name uniqueness within itself. Entries are listed in deterministic
 * name order.
 */
export class Namespace {
  private readonly entriesByName = new Map<string, Entry>();

  private constructor(private currentName: string) {}

  static create(name: unknown): Namespace {
    return new Namespace(ResourceName.create(name).value);
  }

  get name(): string {
    return this.currentName;
  }

  rename(name: unknown): void {
    this.currentName = ResourceName.create(name).value;
  }

  addEntry(entry: Entry): void {
    if (this.entriesByName.has(entry.name)) {
      throw new DuplicateEntryError(this.currentName, entry.name);
    }
    this.entriesByName.set(entry.name, entry);
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
  }

  replaceEntry(originalName: string, entry: Entry): void {
    if (!this.entriesByName.has(originalName)) {
      throw new EntryNotFoundError(this.currentName, originalName);
    }
    if (entry.name !== originalName && this.entriesByName.has(entry.name)) {
      throw new DuplicateEntryError(this.currentName, entry.name);
    }
    this.entriesByName.delete(originalName);
    this.entriesByName.set(entry.name, entry);
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

  toDto(): NamespaceDto {
    return {
      name: this.currentName,
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
