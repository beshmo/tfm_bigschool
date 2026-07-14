import { Entry, NamespaceNotFoundError } from '@okvns/domain';
import { type EntryDto } from '@okvns/shared';
import { type NamespaceRepository } from './ports.js';

/** Partial changes for an entry update; unset fields keep the current value.
 * A blank `description` clears the stored description. */
export interface EntryChanges {
  name?: unknown;
  value?: unknown;
  description?: unknown;
}

export class CreateEntryUseCase {
  constructor(private readonly repository: NamespaceRepository) {}

  async execute(
    namespaceName: string,
    name: unknown,
    value: unknown,
    description?: unknown,
  ): Promise<EntryDto> {
    const namespace = await this.repository.findByName(namespaceName);
    if (!namespace) {
      throw new NamespaceNotFoundError(namespaceName);
    }
    const entry = Entry.create(name, value, description);
    namespace.addEntry(entry);
    await this.repository.save(namespace);
    return entry.toDto();
  }
}

export class ListEntriesUseCase {
  constructor(private readonly repository: NamespaceRepository) {}

  async execute(namespaceName: string): Promise<EntryDto[]> {
    const namespace = await this.repository.findByName(namespaceName);
    if (!namespace) {
      throw new NamespaceNotFoundError(namespaceName);
    }
    return namespace.listEntries().map((entry) => entry.toDto());
  }
}

export class GetEntryUseCase {
  constructor(private readonly repository: NamespaceRepository) {}

  async execute(namespaceName: string, entryName: string): Promise<EntryDto> {
    const namespace = await this.repository.findByName(namespaceName);
    if (!namespace) {
      throw new NamespaceNotFoundError(namespaceName);
    }
    return namespace.getEntry(entryName).toDto();
  }
}

export class UpdateEntryUseCase {
  constructor(private readonly repository: NamespaceRepository) {}

  async execute(
    namespaceName: string,
    entryName: string,
    changes: EntryChanges,
  ): Promise<EntryDto> {
    const namespace = await this.repository.findByName(namespaceName);
    if (!namespace) {
      throw new NamespaceNotFoundError(namespaceName);
    }
    const existing = namespace.getEntry(entryName);
    const nextName = changes.name ?? existing.name;
    const nextValue = changes.value ?? existing.value;
    // An omitted description keeps the current one; a blank one clears it.
    const nextDescription =
      changes.description === undefined ? existing.description : changes.description;
    const updated = Entry.create(nextName, nextValue, nextDescription);
    namespace.replaceEntry(entryName, updated);
    await this.repository.save(namespace);
    return updated.toDto();
  }
}

export class DeleteEntryUseCase {
  constructor(private readonly repository: NamespaceRepository) {}

  async execute(namespaceName: string, entryName: string): Promise<void> {
    const namespace = await this.repository.findByName(namespaceName);
    if (!namespace) {
      throw new NamespaceNotFoundError(namespaceName);
    }
    namespace.removeEntry(entryName);
    await this.repository.save(namespace);
  }
}
