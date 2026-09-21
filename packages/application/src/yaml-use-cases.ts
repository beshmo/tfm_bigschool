import { Entry, Namespace } from '@okvns/domain';
import { parseNamespacesYaml, serializeNamespacesYaml } from '@okvns/yaml';
import { requireNamespace } from './namespace-use-cases.js';
import type { NamespaceRepository } from './ports.js';

function toSerializable(namespace: Namespace) {
  return {
    name: namespace.name,
    description: namespace.description,
    createdAt: namespace.createdAt,
    modifiedAt: namespace.modifiedAt,
    entries: namespace.entries.map((entry) => ({
      name: entry.name,
      value: entry.value,
      description: entry.description,
      envDependent: entry.envDependent,
      createdAt: entry.createdAt,
      modifiedAt: entry.modifiedAt,
    })),
  };
}

export class ImportYamlUseCase {
  constructor(private readonly repository: NamespaceRepository) {}

  /**
   * Parses and validates the whole document and builds fresh aggregates before
   * touching the repository, so a failure mid-document leaves storage untouched.
   */
  async execute(yaml: string): Promise<Namespace[]> {
    const namespaces = parseNamespacesYaml(yaml).map((parsed) =>
      Namespace.create({
        name: parsed.name,
        description: parsed.description,
        entries: parsed.entries.map((entry) => Entry.create(entry)),
      }),
    );
    return this.repository.importNamespaces(namespaces);
  }
}

export class ExportYamlUseCase {
  constructor(private readonly repository: NamespaceRepository) {}

  async execute(): Promise<string> {
    return serializeNamespacesYaml((await this.repository.listAll()).map(toSerializable));
  }
}

export class ExportNamespaceYamlUseCase {
  constructor(private readonly repository: NamespaceRepository) {}

  async execute(name: unknown): Promise<string> {
    return serializeNamespacesYaml([toSerializable(await requireNamespace(this.repository, name))]);
  }
}
