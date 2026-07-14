import { ENTRY_VALUE_MAX_LENGTH, type EntryDto } from '@okvns/shared';
import { InvalidEntryValueError } from './errors.js';
import { ResourceName } from './resource-name.js';

/** Current wall-clock time as an ISO 8601 string. */
const nowIso = (): string => new Date().toISOString();

/**
 * Entry: a validated name paired with a UTF-8 string value, plus creation and
 * modification timestamp metadata. Timestamps are storage lifecycle metadata;
 * `create` stamps a fresh entry with the current time, while `rehydrate` and
 * `stamp` let repositories restore or assign stored timestamps.
 */
export class Entry {
  private constructor(
    readonly name: string,
    readonly value: string,
    private _createdAt: string,
    private _modifiedAt: string,
  ) {}

  static create(name: unknown, value: unknown): Entry {
    const resourceName = ResourceName.create(name);
    if (typeof value !== 'string' || value.length > ENTRY_VALUE_MAX_LENGTH) {
      throw new InvalidEntryValueError(resourceName.value);
    }
    const timestamp = nowIso();
    return new Entry(resourceName.value, value, timestamp, timestamp);
  }

  /** Rebuilds an entry from stored state, preserving its timestamps. */
  static rehydrate(name: unknown, value: unknown, createdAt: string, modifiedAt: string): Entry {
    const entry = Entry.create(name, value);
    entry._createdAt = createdAt;
    entry._modifiedAt = modifiedAt;
    return entry;
  }

  get createdAt(): string {
    return this._createdAt;
  }

  get modifiedAt(): string {
    return this._modifiedAt;
  }

  /** Returns a new entry with the same name and preserved `createdAt`, but the
   * given value and a refreshed `modifiedAt`. */
  withValue(value: unknown): Entry {
    const next = Entry.create(this.name, value);
    next._createdAt = this._createdAt;
    return next;
  }

  /** Overwrites the entry's timestamps (used by repositories when persisting). */
  stamp(createdAt: string, modifiedAt: string): void {
    this._createdAt = createdAt;
    this._modifiedAt = modifiedAt;
  }

  toDto(): EntryDto {
    return {
      name: this.name,
      value: this.value,
      created_at: this._createdAt,
      modified_at: this._modifiedAt,
    };
  }
}
