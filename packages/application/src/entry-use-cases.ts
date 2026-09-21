import { Entry, NamespaceNotFoundError, ResourceName } from '@okvns/domain';
import type { EntryListQuery } from '@okvns/shared';
import { requireNamespace } from './namespace-use-cases.js';
import type { NamespaceRepository, PageResult } from './ports.js';

export interface CreateEntryInput {
  name: unknown;
  value: unknown;
  description?: unknown;
  envDependent?: unknown;
}

export interface UpdateEntryInput {
  name?: unknown;
  value?: unknown;
  description?: unknown;
  envDependent?: unknown;
}

export class CreateEntryUseCase {
  constructor(private readonly repository: NamespaceRepository) {}

  async execute(namespaceName: unknown, input: CreateEntryInput): Promise<Entry> {
    const namespace = await requireNamespace(this.repository, namespaceName);
    const entry = Entry.create(input);
    const saved = await this.repository.save(namespace.addEntry(entry));
    return saved.getEntry(entry.name);
  }
}

export class ListEntriesUseCase {
  constructor(private readonly repository: NamespaceRepository) {}

  async execute(namespaceName: unknown, query: EntryListQuery): Promise<PageResult<Entry>> {
    const name = ResourceName.create(namespaceName, 'Namespace name').value;
    const page = await this.repository.listEntries(name, query);
    if (!page) {
      throw new NamespaceNotFoundError(name);
    }
    return page;
  }
}

export class GetEntryUseCase {
  constructor(private readonly repository: NamespaceRepository) {}

  async execute(namespaceName: unknown, entryName: unknown): Promise<Entry> {
    return (await requireNamespace(this.repository, namespaceName)).getEntry(entryName);
  }
}

export class UpdateEntryUseCase {
  constructor(private readonly repository: NamespaceRepository) {}

  async execute(
    namespaceName: unknown,
    entryName: unknown,
    input: UpdateEntryInput,
  ): Promise<Entry> {
    const namespace = await requireNamespace(this.repository, namespaceName);
    const updatedName = namespace.getEntry(entryName).with(input).name;
    const saved = await this.repository.save(namespace.updateEntry(entryName, input));
    return saved.getEntry(updatedName);
  }
}

export class DeleteEntryUseCase {
  constructor(private readonly repository: NamespaceRepository) {}

  async execute(namespaceName: unknown, entryName: unknown): Promise<void> {
    const namespace = await requireNamespace(this.repository, namespaceName);
    await this.repository.save(namespace.removeEntry(entryName));
  }
}
