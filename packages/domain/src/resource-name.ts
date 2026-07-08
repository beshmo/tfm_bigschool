import { RESOURCE_NAME_MAX_LENGTH, RESOURCE_NAME_PATTERN } from '@okvns/shared';
import { InvalidResourceNameError } from './errors.js';

/**
 * Value object for namespace and entry names. Guarantees a trimmed, non-empty,
 * allowlisted UTF-8 string. Construction is the only way to obtain a valid name.
 */
export class ResourceName {
  private constructor(readonly value: string) {}

  static create(raw: unknown): ResourceName {
    if (typeof raw !== 'string') {
      throw new InvalidResourceNameError(raw);
    }
    const trimmed = raw.trim();
    if (trimmed.length === 0 || trimmed.length > RESOURCE_NAME_MAX_LENGTH) {
      throw new InvalidResourceNameError(raw);
    }
    if (!RESOURCE_NAME_PATTERN.test(trimmed)) {
      throw new InvalidResourceNameError(raw);
    }
    return new ResourceName(trimmed);
  }

  equals(other: ResourceName): boolean {
    return this.value === other.value;
  }
}
