import { Entry, Namespace, NamespaceNotFoundError } from '@okvns/domain';
import { parseNamespacesYaml, serializeNamespacesYaml } from '@okvns/yaml';
import { type NamespaceDto } from '@okvns/shared';
import { type NamespaceRepository } from './ports.js';

export class ImportYamlUseCase {
  constructor(private readonly repository: NamespaceRepository) {}

  /**
   * Parses and fully validates the YAML, building fresh namespace aggregates
   * before any storage write. Only after the entire document is validated are
   * the namespaces upserted, in a single storage transaction, so a validation
   * or storage failure leaves storage unchanged.
   */
  async execute(yaml: string): Promise<NamespaceDto[]> {
    const parsed = parseNamespacesYaml(yaml);
    const built = parsed.map((namespaceDto) => {
      const namespace = Namespace.create(namespaceDto.name, namespaceDto.description);
      namespace.setEntries(
        namespaceDto.entries.map((entry) =>
          Entry.create(entry.name, entry.value, entry.description, entry.envDependent),
        ),
      );
      return namespace;
    });
    await this.repository.importNamespaces(built);
    return built.map((namespace) => namespace.toDto());
  }
}

export class ExportYamlUseCase {
  constructor(private readonly repository: NamespaceRepository) {}

  async execute(): Promise<string> {
    const namespaces = await this.repository.list();
    return serializeNamespacesYaml(namespaces.map((namespace) => namespace.toDto()));
  }
}

export class ExportNamespaceYamlUseCase {
  constructor(private readonly repository: NamespaceRepository) {}

  async execute(name: string): Promise<string> {
    const namespace = await this.repository.findByName(name);
    if (!namespace) {
      throw new NamespaceNotFoundError(name);
    }
    return serializeNamespacesYaml([namespace.toDto()]);
  }
}
