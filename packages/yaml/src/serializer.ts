import { stringify as stringifyYaml } from 'yaml';
import { compareNames, type NamespaceDto } from '@okvns/shared';

/**
 * Serializes namespaces into canonical OKVNS YAML: a raw YAML document using the
 * `namespaces` array shape, with namespaces and entries sorted by name for
 * deterministic output. Namespace and entry `created_at`/`modified_at` timestamp
 * metadata is included so exported YAML is a fuller snapshot, and `description`
 * is emitted only when one is stored. The result is plain YAML, not wrapped in a
 * code fence.
 */
export function serializeNamespacesYaml(namespaces: NamespaceDto[]): string {
  const sorted = [...namespaces]
    .map((namespace) => ({
      name: namespace.name,
      ...(namespace.description === undefined ? {} : { description: namespace.description }),
      created_at: namespace.created_at,
      modified_at: namespace.modified_at,
      entries: [...namespace.entries]
        .sort((a, b) => compareNames(a.name, b.name))
        .map((entry) => ({
          name: entry.name,
          value: entry.value,
          ...(entry.description === undefined ? {} : { description: entry.description }),
          created_at: entry.created_at,
          modified_at: entry.modified_at,
        })),
    }))
    .sort((a, b) => compareNames(a.name, b.name));

  return stringifyYaml({ namespaces: sorted });
}
