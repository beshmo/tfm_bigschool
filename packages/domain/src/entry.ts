import { ENTRY_VALUE_MAX_LENGTH, type EntryDto } from '@okvns/shared';
import { normalizeDescription } from './description.js';
import { normalizeEnvDependent } from './env-dependent.js';
import { InvalidEntryValueError } from './errors.js';
import { ResourceName } from './resource-name.js';

/** Current wall-clock time as an ISO 8601 string. */
const nowIso = (): string => new Date().toISOString();

/**
 * Entry: a validated name paired with a UTF-8 string value, plus an optional
 * description, an environment-dependence marker, and creation/modification
 * timestamp metadata. Timestamps are storage lifecycle metadata; `create` stamps
 * a fresh entry with the current time, while `rehydrate` and `stamp` let
 * repositories restore or assign stored timestamps.
 *
 * `envDependent` marks an entry whose value only makes sense in one deployment
 * environment, so it can be found and adjusted after a cross-environment import.
 * The domain only records the marker; it never rewrites the value.
 */
export class Entry {
  private constructor(
    readonly name: string,
    readonly value: string,
    readonly description: string | undefined,
    readonly envDependent: boolean,
    private _createdAt: string,
    private _modifiedAt: string,
  ) {}

  static create(
    name: unknown,
    value: unknown,
    description?: unknown,
    envDependent?: unknown,
  ): Entry {
    const resourceName = ResourceName.create(name);
    if (typeof value !== 'string' || value.length > ENTRY_VALUE_MAX_LENGTH) {
      throw new InvalidEntryValueError(resourceName.value);
    }
    const timestamp = nowIso();
    return new Entry(
      resourceName.value,
      value,
      normalizeDescription(description, resourceName.value),
      normalizeEnvDependent(envDependent, resourceName.value),
      timestamp,
      timestamp,
    );
  }

  /** Rebuilds an entry from stored state, preserving its timestamps. */
  static rehydrate(
    name: unknown,
    value: unknown,
    createdAt: string,
    modifiedAt: string,
    description?: unknown,
    envDependent?: unknown,
  ): Entry {
    const entry = Entry.create(name, value, description, envDependent);
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
   * given value/description/env-dependence and a refreshed `modifiedAt`. An
   * omitted argument keeps the current field; a blank description clears it. */
  withValue(value: unknown, description?: unknown, envDependent?: unknown): Entry {
    const next = Entry.create(
      this.name,
      value,
      description === undefined ? this.description : description,
      envDependent === undefined ? this.envDependent : envDependent,
    );
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
      ...(this.description === undefined ? {} : { description: this.description }),
      env_dependent: this.envDependent,
      created_at: this._createdAt,
      modified_at: this._modifiedAt,
    };
  }
}
