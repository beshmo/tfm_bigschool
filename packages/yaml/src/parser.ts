import {
  DESCRIPTION_MAX_LENGTH,
  ENTRY_VALUE_MAX_LENGTH,
  ERROR_CODES,
  REQUEST_BODY_MAX_BYTES,
  RESOURCE_NAME_MAX_LENGTH,
  RESOURCE_NAME_PATTERN,
} from '@okvns/shared';
import { parseDocument } from 'yaml';
import { YamlError } from './errors.js';

export interface ParsedEntry {
  name: string;
  value: string;
  description?: string;
  envDependent: boolean;
}

export interface ParsedNamespace {
  name: string;
  description?: string;
  entries: ParsedEntry[];
}

const ROOT_KEYS = new Set(['namespaces', 'namespace']);
const NAMESPACE_KEYS = new Set(['name', 'description', 'entries', 'created_at', 'modified_at']);
const ENTRY_KEYS = new Set([
  'name',
  'value',
  'description',
  'env_dependent',
  'created_at',
  'modified_at',
]);

function fail(message: string, details: readonly string[] = []): never {
  throw new YamlError(ERROR_CODES.INVALID_YAML, message, details);
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function assertKeys(record: Record<string, unknown>, allowed: Set<string>, where: string): void {
  for (const key of Object.keys(record)) {
    if (!allowed.has(key)) {
      fail(`Unexpected key "${key}" in ${where}.`);
    }
  }
}

function parseName(raw: unknown, where: string): string {
  if (typeof raw !== 'string') {
    fail(`${where}: name must be a string.`);
  }
  const name = raw.trim();
  if (name.length === 0 || name.length > RESOURCE_NAME_MAX_LENGTH) {
    fail(`${where}: name must be 1 to ${RESOURCE_NAME_MAX_LENGTH} characters.`);
  }
  if (!RESOURCE_NAME_PATTERN.test(name)) {
    fail(
      `${where}: name "${name}" must start with a letter or digit and contain only letters, digits, ".", "_" or "-".`,
    );
  }
  return name;
}

function parseDescription(raw: unknown, where: string): string | undefined {
  if (raw === undefined) {
    return undefined;
  }
  if (typeof raw !== 'string') {
    fail(`${where}: description must be a string.`);
  }
  const description = raw.trim();
  if (description.length > DESCRIPTION_MAX_LENGTH) {
    fail(`${where}: description must be at most ${DESCRIPTION_MAX_LENGTH} characters.`);
  }
  return description.length === 0 ? undefined : description;
}

function parseEntry(raw: unknown, where: string): ParsedEntry {
  if (!isRecord(raw)) {
    fail(`${where}: an entry must be a mapping.`);
  }
  assertKeys(raw, ENTRY_KEYS, where);
  if (typeof raw.value !== 'string') {
    fail(`${where}: value must be a string.`);
  }
  if (raw.value.length > ENTRY_VALUE_MAX_LENGTH) {
    fail(`${where}: value must be at most ${ENTRY_VALUE_MAX_LENGTH} characters.`);
  }
  if (raw.env_dependent !== undefined && typeof raw.env_dependent !== 'boolean') {
    fail(`${where}: env_dependent must be a boolean.`);
  }
  const entry: ParsedEntry = {
    name: parseName(raw.name, where),
    value: raw.value,
    envDependent: raw.env_dependent ?? false,
  };
  const description = parseDescription(raw.description, where);
  if (description !== undefined) {
    entry.description = description;
  }
  return entry;
}

function parseNamespace(raw: unknown, where: string): ParsedNamespace {
  if (!isRecord(raw)) {
    fail(`${where}: a namespace must be a mapping.`);
  }
  assertKeys(raw, NAMESPACE_KEYS, where);
  const name = parseName(raw.name, where);
  if (!Array.isArray(raw.entries)) {
    fail(`${where}: entries must be a list.`);
  }
  const namespace: ParsedNamespace = { name, entries: [] };
  const description = parseDescription(raw.description, where);
  if (description !== undefined) {
    namespace.description = description;
  }
  const seen = new Set<string>();
  raw.entries.forEach((rawEntry: unknown, index: number) => {
    const entry = parseEntry(rawEntry, `${where}.entries[${index}]`);
    if (seen.has(entry.name)) {
      throw new YamlError(
        ERROR_CODES.DUPLICATE_ENTRY,
        `${where}: duplicate entry "${entry.name}".`,
      );
    }
    seen.add(entry.name);
    namespace.entries.push(entry);
  });
  return namespace;
}

/**
 * Strictly parses OKVNS YAML. Validates the whole document and returns fresh,
 * normalized namespaces, or throws a {@link YamlError}; nothing is partially applied.
 */
export function parseNamespacesYaml(text: string): ParsedNamespace[] {
  if (text.trim().length === 0) {
    fail('YAML content must not be empty.');
  }
  if (Buffer.byteLength(text, 'utf8') > REQUEST_BODY_MAX_BYTES) {
    fail(`YAML content must be at most ${REQUEST_BODY_MAX_BYTES} bytes.`);
  }
  const document = parseDocument(text, { uniqueKeys: true });
  if (document.errors.length > 0) {
    fail(
      'YAML content is not valid YAML.',
      document.errors.map((error) => error.message),
    );
  }
  let root: unknown;
  try {
    root = document.toJS({ maxAliasCount: 0 });
  } catch {
    fail('YAML aliases are not supported.');
  }
  if (!isRecord(root)) {
    fail('The YAML document must be a mapping with a "namespaces" list or a "namespace" mapping.');
  }
  assertKeys(root, ROOT_KEYS, 'the document root');
  const hasPlural = Object.hasOwn(root, 'namespaces');
  const hasSingle = Object.hasOwn(root, 'namespace');
  if (hasPlural && hasSingle) {
    fail('Use either "namespaces" or "namespace", not both.');
  }
  let rawNamespaces: unknown[];
  if (hasPlural) {
    if (!Array.isArray(root.namespaces)) {
      fail('"namespaces" must be a list.');
    }
    rawNamespaces = root.namespaces;
  } else if (hasSingle) {
    rawNamespaces = [root.namespace];
  } else {
    fail('The YAML document must contain a "namespaces" list or a "namespace" mapping.');
  }
  const seen = new Set<string>();
  return rawNamespaces.map((rawNamespace, index) => {
    const namespace = parseNamespace(
      rawNamespace,
      hasPlural ? `namespaces[${index}]` : 'namespace',
    );
    if (seen.has(namespace.name)) {
      throw new YamlError(
        ERROR_CODES.DUPLICATE_NAMESPACE,
        `Duplicate namespace "${namespace.name}".`,
      );
    }
    seen.add(namespace.name);
    return namespace;
  });
}
