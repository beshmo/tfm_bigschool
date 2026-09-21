import { compareNames } from '@okvns/shared';
import { stringify } from 'yaml';

export interface SerializableEntry {
  name: string;
  value: string;
  description?: string;
  envDependent: boolean;
  createdAt?: Date;
  modifiedAt?: Date;
}

export interface SerializableNamespace {
  name: string;
  description?: string;
  entries: readonly SerializableEntry[];
  createdAt?: Date;
  modifiedAt?: Date;
}

function withTimestamps(
  record: Record<string, unknown>,
  createdAt: Date | undefined,
  modifiedAt: Date | undefined,
): Record<string, unknown> {
  if (createdAt) {
    record.created_at = createdAt.toISOString();
  }
  if (modifiedAt) {
    record.modified_at = modifiedAt.toISOString();
  }
  return record;
}

function entryToPlain(entry: SerializableEntry): Record<string, unknown> {
  const record: Record<string, unknown> = { name: entry.name, value: entry.value };
  if (entry.description !== undefined) {
    record.description = entry.description;
  }
  record.env_dependent = entry.envDependent;
  return withTimestamps(record, entry.createdAt, entry.modifiedAt);
}

function namespaceToPlain(namespace: SerializableNamespace): Record<string, unknown> {
  const record: Record<string, unknown> = { name: namespace.name };
  if (namespace.description !== undefined) {
    record.description = namespace.description;
  }
  withTimestamps(record, namespace.createdAt, namespace.modifiedAt);
  record.entries = [...namespace.entries]
    .sort((a, b) => compareNames(a.name, b.name))
    .map(entryToPlain);
  return record;
}

/** Emits raw, canonical OKVNS YAML (`namespaces` list, sorted by name, no code fence). */
export function serializeNamespacesYaml(namespaces: readonly SerializableNamespace[]): string {
  const sorted = [...namespaces].sort((a, b) => compareNames(a.name, b.name));
  return stringify({ namespaces: sorted.map(namespaceToPlain) }, { lineWidth: 0 });
}
