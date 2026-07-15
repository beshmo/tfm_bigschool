import { InvalidEnvDependentError } from './errors.js';

/**
 * Normalizes the optional environment-dependence marker on an entry.
 *
 * The flag is a binary marker, not tri-state data: `undefined` and `null` mean
 * "not provided" and normalize to `false`, so entries created before the flag
 * existed and requests that omit it read back the same way. Anything that is not
 * a boolean is rejected rather than coerced — a hand-edited `"true"` string is a
 * mistake worth surfacing, not a truthy value.
 *
 * @param raw - The candidate flag.
 * @param entryName - Name used to build a helpful validation message.
 * @returns The boolean flag, defaulting to `false` when absent.
 * @throws {InvalidEnvDependentError} When present but not a boolean.
 */
export function normalizeEnvDependent(raw: unknown, entryName: string): boolean {
  if (raw === undefined || raw === null) {
    return false;
  }
  if (typeof raw !== 'boolean') {
    throw new InvalidEnvDependentError(entryName);
  }
  return raw;
}
