import { ENTRY_VALUE_MAX_LENGTH } from '@okvns/shared';
import { normalizeDescription } from './description.js';
import { normalizeEnvDependent } from './env-dependent.js';
import { InvalidEntryValueError } from './errors.js';
import { ResourceName } from './resource-name.js';

export interface EntryProps {
  name: unknown;
  value: unknown;
  description?: unknown;
  envDependent?: unknown;
  /** Set by repositories when hydrating stored entries. */
  createdAt?: Date;
  modifiedAt?: Date;
}

/** Fields an update may change; `undefined` means "leave unchanged". */
export interface EntryPatch {
  name?: unknown;
  value?: unknown;
  /** A blank string clears the stored description. */
  description?: unknown;
  envDependent?: unknown;
}

function normalizeValue(raw: unknown): string {
  if (typeof raw !== 'string') {
    throw new InvalidEntryValueError('Entry value must be a string.');
  }
  if (raw.length > ENTRY_VALUE_MAX_LENGTH) {
    throw new InvalidEntryValueError(
      `Entry value must be at most ${ENTRY_VALUE_MAX_LENGTH} characters.`,
    );
  }
  return raw;
}

/** An immutable key-value entry inside a namespace. */
export class Entry {
  private constructor(
    readonly name: string,
    readonly value: string,
    readonly description: string | undefined,
    readonly envDependent: boolean,
    readonly createdAt: Date | undefined,
    readonly modifiedAt: Date | undefined,
  ) {}

  static create(props: EntryProps): Entry {
    return new Entry(
      ResourceName.create(props.name, 'Entry name').value,
      normalizeValue(props.value),
      normalizeDescription(props.description, 'Entry description'),
      normalizeEnvDependent(props.envDependent),
      props.createdAt,
      props.modifiedAt,
    );
  }

  /** Returns a copy with the patched fields; timestamps are left for the repository. */
  with(patch: EntryPatch): Entry {
    return new Entry(
      patch.name === undefined ? this.name : ResourceName.create(patch.name, 'Entry name').value,
      patch.value === undefined ? this.value : normalizeValue(patch.value),
      patch.description === undefined
        ? this.description
        : normalizeDescription(patch.description, 'Entry description'),
      patch.envDependent === undefined
        ? this.envDependent
        : normalizeEnvDependent(patch.envDependent),
      this.createdAt,
      this.modifiedAt,
    );
  }

  withTimestamps(createdAt: Date | undefined, modifiedAt: Date | undefined): Entry {
    return new Entry(
      this.name,
      this.value,
      this.description,
      this.envDependent,
      createdAt,
      modifiedAt,
    );
  }

  /** True when every user-authored field matches (timestamps are ignored). */
  hasSameContent(other: Entry): boolean {
    return (
      this.name === other.name &&
      this.value === other.value &&
      this.description === other.description &&
      this.envDependent === other.envDependent
    );
  }
}
