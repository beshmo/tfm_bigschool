import { InvalidEnvDependentError } from './errors.js';

/** Only booleans are accepted; an omitted marker means `false`. */
export function normalizeEnvDependent(raw: unknown): boolean {
  if (raw === undefined) {
    return false;
  }
  if (typeof raw !== 'boolean') {
    throw new InvalidEnvDependentError();
  }
  return raw;
}
