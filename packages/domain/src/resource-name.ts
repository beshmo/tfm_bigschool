import { RESOURCE_NAME_MAX_LENGTH, RESOURCE_NAME_PATTERN } from '@okvns/shared';
import { InvalidResourceNameError } from './errors.js';

/** A validated, trimmed namespace or entry name. */
export class ResourceName {
  private constructor(readonly value: string) {}

  static create(raw: unknown, label = 'Name'): ResourceName {
    if (typeof raw !== 'string') {
      throw new InvalidResourceNameError(`${label} must be a string.`);
    }
    const value = raw.trim();
    if (value.length === 0) {
      throw new InvalidResourceNameError(`${label} must not be empty.`);
    }
    if (value.length > RESOURCE_NAME_MAX_LENGTH) {
      throw new InvalidResourceNameError(
        `${label} must be at most ${RESOURCE_NAME_MAX_LENGTH} characters.`,
      );
    }
    if (!RESOURCE_NAME_PATTERN.test(value)) {
      throw new InvalidResourceNameError(
        `${label} must start with a letter or digit and contain only letters, digits, ".", "_" or "-".`,
      );
    }
    return new ResourceName(value);
  }

  equals(other: ResourceName): boolean {
    return this.value === other.value;
  }

  toString(): string {
    return this.value;
  }
}
