import { DESCRIPTION_MAX_LENGTH } from '@okvns/shared';
import { InvalidDescriptionError } from './errors.js';

/**
 * Normalizes an optional, user-authored description.
 *
 * Descriptions are documentation metadata, not identifiers: they are trimmed,
 * and blank or whitespace-only input is treated as "no description" rather than
 * stored as meaningless text. `undefined` and `null` mean absent.
 *
 * @param raw - The candidate description.
 * @param resourceName - Name used to build a helpful validation message.
 * @returns The trimmed description, or `undefined` when absent or blank.
 * @throws {InvalidDescriptionError} When non-string or longer than the limit.
 */
export function normalizeDescription(raw: unknown, resourceName: string): string | undefined {
  if (raw === undefined || raw === null) {
    return undefined;
  }
  if (typeof raw !== 'string') {
    throw new InvalidDescriptionError(resourceName);
  }
  const trimmed = raw.trim();
  if (trimmed.length === 0) {
    return undefined;
  }
  if (trimmed.length > DESCRIPTION_MAX_LENGTH) {
    throw new InvalidDescriptionError(resourceName);
  }
  return trimmed;
}
