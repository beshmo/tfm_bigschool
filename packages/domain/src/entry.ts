import { ENTRY_VALUE_MAX_LENGTH, type EntryDto } from '@okvns/shared';
import { InvalidEntryValueError } from './errors.js';
import { ResourceName } from './resource-name.js';

/**
 * Immutable entry: a validated name paired with a UTF-8 string value.
 */
export class Entry {
  private constructor(
    readonly name: string,
    readonly value: string,
  ) {}

  static create(name: unknown, value: unknown): Entry {
    const resourceName = ResourceName.create(name);
    if (typeof value !== 'string' || value.length > ENTRY_VALUE_MAX_LENGTH) {
      throw new InvalidEntryValueError(resourceName.value);
    }
    return new Entry(resourceName.value, value);
  }

  withValue(value: unknown): Entry {
    return Entry.create(this.name, value);
  }

  toDto(): EntryDto {
    return { name: this.name, value: this.value };
  }
}
