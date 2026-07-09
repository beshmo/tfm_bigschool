import { stringify as stringifyYaml } from 'yaml';
import { compareNames, type NamespaceDto } from '@okvns/shared';

/**
 * Serializes namespaces into canonical OKVNS YAML: a raw YAML document using the
 * `namespaces` array shape, with namespaces and entries sorted by name for
 * deterministic output. The result is plain YAML, not wrapped in a code fence.
 */
export function serializeNamespacesYaml(namespaces: NamespaceDto[]): string {
  const sorted = [...namespaces]
    .map((namespace) => ({
      name: namespace.name,
      entries: [...namespace.entries]
        .sort((a, b) => compareNames(a.name, b.name))
        .map((entry) => ({ name: entry.name, value: entry.value })),
    }))
    .sort((a, b) => compareNames(a.name, b.name));

  return stringifyYaml({ namespaces: sorted });
}
