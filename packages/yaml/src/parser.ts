import { parse as parseYaml } from 'yaml';
import {
  ERROR_CODES,
  REQUEST_BODY_MAX_BYTES,
  RESOURCE_NAME_PATTERN,
  type EntryDto,
  type NamespaceDto,
} from '@okvns/shared';
import { YamlError } from './errors.js';

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

function parseEntries(raw: unknown, namespaceName: string): EntryDto[] {
  if (raw === undefined) {
    return [];
  }
  if (!Array.isArray(raw)) {
    throw invalid(`Entries for namespace "${namespaceName}" must be an array.`);
  }
  const seen = new Set<string>();
  const entries: EntryDto[] = [];
  for (const item of raw) {
    if (!isRecord(item)) {
      throw invalid('Each entry must be an object with "name" and "value".');
    }
    for (const key of Object.keys(item)) {
      if (key !== 'name' && key !== 'value') {
        throw invalid(`Unexpected entry key "${key}".`);
      }
    }
    const name = normalizeName(item.name, 'Entry name is missing or invalid.');
    if (typeof item.value !== 'string') {
      throw invalid(`Entry "${name}" must have a string value.`);
    }
    if (seen.has(name)) {
      throw new YamlError(
        ERROR_CODES.DUPLICATE_ENTRY,
        `Duplicate entry "${name}" in namespace "${namespaceName}".`,
      );
    }
    seen.add(name);
    entries.push({ name, value: item.value });
  }
  return entries;
}

/**
 * Parses OKVNS YAML into normalized namespace DTOs. Validates the entire
 * document — allowlisted keys, shapes, sizes, and duplicates — before returning,
 * so callers can treat a successful parse as safe to apply atomically.
 */
export function parseNamespacesYaml(yaml: string): NamespaceDto[] {
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
  const namespaces: NamespaceDto[] = [];
  for (const item of rawList) {
    if (!isRecord(item)) {
      throw invalid('Each namespace must be an object with "name" and "entries".');
    }
    for (const key of Object.keys(item)) {
      if (key !== 'name' && key !== 'entries') {
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
    namespaces.push({ name, entries: parseEntries(item.entries, name) });
  }

  return namespaces;
}
