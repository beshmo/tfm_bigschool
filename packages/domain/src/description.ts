import { DESCRIPTION_MAX_LENGTH } from '@okvns/shared';
import { InvalidDescriptionError } from './errors.js';

/**
 * Trims a description; a missing or blank one means "no description".
 * Non-strings and descriptions over the limit are rejected.
 */
export function normalizeDescription(raw: unknown, label = 'Description'): string | undefined {
  if (raw === undefined || raw === null) {
    return undefined;
  }
  if (typeof raw !== 'string') {
    throw new InvalidDescriptionError(`${label} must be a string.`);
  }
  const value = raw.trim();
  if (value.length === 0) {
    return undefined;
  }
  if (value.length > DESCRIPTION_MAX_LENGTH) {
    throw new InvalidDescriptionError(
      `${label} must be at most ${DESCRIPTION_MAX_LENGTH} characters.`,
    );
  }
  return value;
}
