import { stringify as stringifyYaml } from 'yaml';
import { compareNames, type NamespaceDto } from '@okvns/shared';

/**
 * Serializes namespaces into canonical OKVNS markdown: a single ```yaml fenced
 * block using the `namespaces` array shape, with namespaces and entries sorted
 * by name for deterministic output.
 */
export function serializeNamespacesMarkdown(namespaces: NamespaceDto[]): string {
  const sorted = [...namespaces]
    .map((namespace) => ({
      name: namespace.name,
      entries: [...namespace.entries]
        .sort((a, b) => compareNames(a.name, b.name))
        .map((entry) => ({ name: entry.name, value: entry.value })),
    }))
    .sort((a, b) => compareNames(a.name, b.name));

  const yaml = stringifyYaml({ namespaces: sorted }).trimEnd();
  return '```yaml\n' + yaml + '\n```\n';
}
