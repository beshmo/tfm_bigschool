import { normalizeDescription } from './description.js';
import { Entry } from './entry.js';
import type { EntryPatch } from './entry.js';
import { DuplicateEntryError, EmptyNamespaceUpdateError, EntryNotFoundError } from './errors.js';
import { ResourceName } from './resource-name.js';

export interface NamespaceProps {
  name: unknown;
  description?: unknown;
  entries?: readonly Entry[];
  /** Set by repositories when hydrating stored namespaces. */
  createdAt?: Date;
  modifiedAt?: Date;
}

export interface NamespacePatch {
  name?: unknown;
  /** A blank string clears the stored description. */
  description?: unknown;
}

/** A namespace aggregate: a unique name plus entries with unique names. */
export class Namespace {
  private constructor(
    readonly name: string,
    readonly description: string | undefined,
    readonly entries: readonly Entry[],
    readonly createdAt: Date | undefined,
    readonly modifiedAt: Date | undefined,
  ) {}

  static create(props: NamespaceProps): Namespace {
    const entries = props.entries ?? [];
    const seen = new Set<string>();
    for (const entry of entries) {
      if (seen.has(entry.name)) {
        throw new DuplicateEntryError(entry.name);
      }
      seen.add(entry.name);
    }
    return new Namespace(
      ResourceName.create(props.name, 'Namespace name').value,
      normalizeDescription(props.description, 'Namespace description'),
      [...entries],
      props.createdAt,
      props.modifiedAt,
    );
  }

  hasEntry(name: string): boolean {
    return this.entries.some((entry) => entry.name === name);
  }

  getEntry(rawName: unknown): Entry {
    const name = ResourceName.create(rawName, 'Entry name').value;
    const entry = this.entries.find((candidate) => candidate.name === name);
    if (!entry) {
      throw new EntryNotFoundError(name);
    }
    return entry;
  }

  addEntry(entry: Entry): Namespace {
    if (this.hasEntry(entry.name)) {
      throw new DuplicateEntryError(entry.name);
    }
    return this.withEntries([...this.entries, entry]);
  }

  updateEntry(rawName: unknown, patch: EntryPatch): Namespace {
    const current = this.getEntry(rawName);
    const updated = current.with(patch);
    if (updated.name !== current.name && this.hasEntry(updated.name)) {
      throw new DuplicateEntryError(updated.name);
    }
    return this.withEntries(this.entries.map((entry) => (entry === current ? updated : entry)));
  }

  removeEntry(rawName: unknown): Namespace {
    const current = this.getEntry(rawName);
    return this.withEntries(this.entries.filter((entry) => entry !== current));
  }

  /** Replaces every entry (used by YAML import upserts). */
  replaceEntries(entries: readonly Entry[]): Namespace {
    return Namespace.create({
      name: this.name,
      description: this.description,
      entries,
      createdAt: this.createdAt,
      modifiedAt: this.modifiedAt,
    });
  }

  /** Renames and/or re-describes the namespace, keeping its entries. */
  update(patch: NamespacePatch): Namespace {
    if (patch.name === undefined && patch.description === undefined) {
      throw new EmptyNamespaceUpdateError();
    }
    return new Namespace(
      patch.name === undefined
        ? this.name
        : ResourceName.create(patch.name, 'Namespace name').value,
      patch.description === undefined
        ? this.description
        : normalizeDescription(patch.description, 'Namespace description'),
      this.entries,
      this.createdAt,
      this.modifiedAt,
    );
  }

  withTimestamps(createdAt: Date | undefined, modifiedAt: Date | undefined): Namespace {
    return new Namespace(this.name, this.description, this.entries, createdAt, modifiedAt);
  }

  private withEntries(entries: readonly Entry[]): Namespace {
    return new Namespace(this.name, this.description, entries, this.createdAt, this.modifiedAt);
  }
}
