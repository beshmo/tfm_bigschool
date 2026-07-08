import { Entry, Namespace, NamespaceNotFoundError } from '@okvns/domain';
import { parseNamespacesMarkdown, serializeNamespacesMarkdown } from '@okvns/markdown';
import { type NamespaceDto } from '@okvns/shared';
import { type NamespaceRepository } from './ports.js';

export class ImportMarkdownUseCase {
  constructor(private readonly repository: NamespaceRepository) {}

  /**
   * Parses and fully validates the markdown, building fresh namespace aggregates
   * before any storage write. Only after the entire document is validated are
   * the namespaces upserted, so a failure leaves storage unchanged.
   */
  async execute(markdown: string): Promise<NamespaceDto[]> {
    const parsed = parseNamespacesMarkdown(markdown);
    const built = parsed.map((namespaceDto) => {
      const namespace = Namespace.create(namespaceDto.name);
      namespace.setEntries(namespaceDto.entries.map((entry) => Entry.create(entry.name, entry.value)));
      return namespace;
    });
    for (const namespace of built) {
      await this.repository.save(namespace);
    }
    return built.map((namespace) => namespace.toDto());
  }
}

export class ExportMarkdownUseCase {
  constructor(private readonly repository: NamespaceRepository) {}

  async execute(): Promise<string> {
    const namespaces = await this.repository.list();
    return serializeNamespacesMarkdown(namespaces.map((namespace) => namespace.toDto()));
  }
}

export class ExportNamespaceMarkdownUseCase {
  constructor(private readonly repository: NamespaceRepository) {}

  async execute(name: string): Promise<string> {
    const namespace = await this.repository.findByName(name);
    if (!namespace) {
      throw new NamespaceNotFoundError(name);
    }
    return serializeNamespacesMarkdown([namespace.toDto()]);
  }
}
