import { parse as parseYaml } from 'yaml';
import {
  DESCRIPTION_MAX_LENGTH,
  ERROR_CODES,
  REQUEST_BODY_MAX_BYTES,
  RESOURCE_NAME_PATTERN,
} from '@okvns/shared';
import { YamlError } from './errors.js';

/**
 * Parsed entry. Descriptions and the environment-dependence marker are
 * user-authored data and are preserved, unlike timestamp metadata: `created_at`
 * and `modified_at` keys are accepted on input but ignored, because timestamps
 * describe the target store lifecycle, not the source document.
 */
export interface ParsedEntry {
  name: string;
  value: string;
  description?: string;
  /** Defaults to `false` when the document omits `env_dependent`. */
  envDependent: boolean;
}

/** Parsed namespace, without timestamp metadata (see {@link ParsedEntry}). */
export interface ParsedNamespace {
  name: string;
  description?: string;
  entries: ParsedEntry[];
}

/** Optional timestamp-metadata keys accepted (and ignored) on import. */
const IGNORED_METADATA_KEYS = new Set(['created_at', 'modified_at']);

const invalid = (message: string): YamlError => new YamlError(ERROR_CODES.INVALID_YAML, message);

const byteLength = (text: string): number => new TextEncoder().encode(text).length;

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function safeParseYaml(text: string): unknown {
  try {
    return parseYaml(text, { maxAliasCount: 100 });
  } catch {
    throw invalid('Content is not valid YAML.');
  }
}

function normalizeName(raw: unknown, message: string): string {
  if (typeof raw !== 'string') {
    throw invalid(message);
  }
  const trimmed = raw.trim();
  if (!RESOURCE_NAME_PATTERN.test(trimmed)) {
    throw invalid(message);
  }
  return trimmed;
}

/**
 * Validates an optional description at the YAML boundary, mirroring the domain
 * rule: strings only, at most {@link DESCRIPTION_MAX_LENGTH} characters, with
 * blank values normalized to absent.
 */
function parseDescription(raw: unknown, message: string): string | undefined {
  if (raw === undefined || raw === null) {
    return undefined;
  }
  if (typeof raw !== 'string' || raw.trim().length > DESCRIPTION_MAX_LENGTH) {
    throw invalid(message);
  }
  const trimmed = raw.trim();
  return trimmed.length === 0 ? undefined : trimmed;
}

/**
 * Validates the optional environment-dependence marker at the YAML boundary,
 * mirroring the domain rule: booleans only, absent means `false`. A quoted
 * `"true"` in a hand-edited file is rejected rather than read as truthy.
 */
function parseEnvDependent(raw: unknown, message: string): boolean {
  if (raw === undefined || raw === null) {
    return false;
  }
  if (typeof raw !== 'boolean') {
    throw invalid(message);
  }
  return raw;
}

function parseEntries(raw: unknown, namespaceName: string): ParsedEntry[] {
  if (raw === undefined) {
    return [];
  }
  if (!Array.isArray(raw)) {
    throw invalid(`Entries for namespace "${namespaceName}" must be an array.`);
  }
  const seen = new Set<string>();
  const entries: ParsedEntry[] = [];
  for (const item of raw) {
    if (!isRecord(item)) {
      throw invalid('Each entry must be an object with "name" and "value".');
    }
    for (const key of Object.keys(item)) {
      if (
        key !== 'name' &&
        key !== 'value' &&
        key !== 'description' &&
        key !== 'env_dependent' &&
        !IGNORED_METADATA_KEYS.has(key)
      ) {
        throw invalid(`Unexpected entry key "${key}".`);
      }
    }
    const name = normalizeName(item.name, 'Entry name is missing or invalid.');
    if (typeof item.value !== 'string') {
      throw invalid(`Entry "${name}" must have a string value.`);
    }
    const description = parseDescription(
      item.description,
      `Entry "${name}" description must be a string of at most ${DESCRIPTION_MAX_LENGTH} characters.`,
    );
    const envDependent = parseEnvDependent(
      item.env_dependent,
      `Entry "${name}" env_dependent must be a boolean.`,
    );
    if (seen.has(name)) {
      throw new YamlError(
        ERROR_CODES.DUPLICATE_ENTRY,
        `Duplicate entry "${name}" in namespace "${namespaceName}".`,
      );
    }
    seen.add(name);
    entries.push({
      name,
      value: item.value,
      ...(description === undefined ? {} : { description }),
      envDependent,
    });
  }
  return entries;
}

/**
 * Parses OKVNS YAML into normalized namespace DTOs. Validates the entire
 * document — allowlisted keys, shapes, sizes, and duplicates — before returning,
 * so callers can treat a successful parse as safe to apply atomically.
 */
export function parseNamespacesYaml(yaml: string): ParsedNamespace[] {
  if (byteLength(yaml) > REQUEST_BODY_MAX_BYTES) {
    throw invalid('YAML payload exceeds the maximum allowed size.');
  }

  const root = safeParseYaml(yaml);
  if (!isRecord(root)) {
    throw invalid('YAML must contain a "namespaces" array or a "namespace" object.');
  }

  const hasMany = Object.prototype.hasOwnProperty.call(root, 'namespaces');
  const hasSingle = Object.prototype.hasOwnProperty.call(root, 'namespace');
  if (hasMany && hasSingle) {
    throw invalid('Provide either "namespace" or "namespaces", not both.');
  }
  if (!hasMany && !hasSingle) {
    throw invalid('Root must contain a "namespaces" array or a "namespace" object.');
  }

  const rootKey = hasMany ? 'namespaces' : 'namespace';
  for (const key of Object.keys(root)) {
    if (key !== rootKey) {
      throw invalid(`Unexpected root key "${key}".`);
    }
  }

  const rawList = hasMany ? root.namespaces : [root.namespace];
  if (!Array.isArray(rawList)) {
    throw invalid('"namespaces" must be an array.');
  }

  const seen = new Set<string>();
  const namespaces: ParsedNamespace[] = [];
  for (const item of rawList) {
    if (!isRecord(item)) {
      throw invalid('Each namespace must be an object with "name" and "entries".');
    }
    for (const key of Object.keys(item)) {
      if (
        key !== 'name' &&
        key !== 'entries' &&
        key !== 'description' &&
        !IGNORED_METADATA_KEYS.has(key)
      ) {
        throw invalid(`Unexpected namespace key "${key}".`);
      }
    }
    const name = normalizeName(item.name, 'Namespace name is missing or invalid.');
    if (seen.has(name)) {
      throw new YamlError(
        ERROR_CODES.DUPLICATE_NAMESPACE,
        `Duplicate namespace "${name}" in imported YAML.`,
      );
    }
    seen.add(name);
    const description = parseDescription(
      item.description,
      `Namespace "${name}" description must be a string of at most ${DESCRIPTION_MAX_LENGTH} characters.`,
    );
    namespaces.push({
      name,
      ...(description === undefined ? {} : { description }),
      entries: parseEntries(item.entries, name),
    });
  }

  return namespaces;
}
