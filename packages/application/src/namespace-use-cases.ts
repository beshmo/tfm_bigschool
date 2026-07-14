import {
  EmptyNamespaceUpdateError,
  Namespace,
  NamespaceNotFoundError,
  ResourceName,
  compareNames,
} from '@okvns/domain';
import { type NamespaceDto } from '@okvns/shared';
import { type NamespaceRepository } from './ports.js';

/** Partial changes for a namespace update; unset fields keep their current
 * value. A blank `description` clears the stored description. */
export interface NamespaceChanges {
  name?: unknown;
  description?: unknown;
}

export class CreateNamespaceUseCase {
  constructor(private readonly repository: NamespaceRepository) {}

  async execute(name: unknown, description?: unknown): Promise<NamespaceDto> {
    const namespace = Namespace.create(name, description);
    // `create` relies on the storage unique constraint, so concurrent requests
    // for the same name cannot both succeed.
    await this.repository.create(namespace);
    return namespace.toDto();
  }
}

export class ListNamespacesUseCase {
  constructor(private readonly repository: NamespaceRepository) {}

  async execute(): Promise<NamespaceDto[]> {
    const namespaces = await this.repository.list();
    return namespaces
      .sort((a, b) => compareNames(a.name, b.name))
      .map((namespace) => namespace.toDto());
  }
}

export class GetNamespaceUseCase {
  constructor(private readonly repository: NamespaceRepository) {}

  async execute(name: string): Promise<NamespaceDto> {
    const namespace = await this.repository.findByName(name);
    if (!namespace) {
      throw new NamespaceNotFoundError(name);
    }
    return namespace.toDto();
  }
}

export class UpdateNamespaceUseCase {
  constructor(private readonly repository: NamespaceRepository) {}

  async execute(currentName: string, changes: NamespaceChanges): Promise<NamespaceDto> {
    const namespace = await this.repository.findByName(currentName);
    if (!namespace) {
      throw new NamespaceNotFoundError(currentName);
    }
    if (changes.name === undefined && changes.description === undefined) {
      throw new EmptyNamespaceUpdateError(currentName);
    }
    // Validate (and apply in-memory) the description first so an invalid one
    // rejects before any storage write.
    if (changes.description !== undefined) {
      namespace.describe(changes.description);
    }
    if (changes.name !== undefined) {
      const target = ResourceName.create(changes.name).value;
      if (target !== namespace.name) {
        // Rename atomically in storage so a partial failure cannot drop the
        // original namespace or leave the target name half-written.
        await this.repository.rename(namespace.name, target);
        namespace.rename(target);
      }
    }
    if (changes.description !== undefined) {
      // Persist the description under the (possibly renamed) namespace.
      await this.repository.save(namespace);
    }
    return namespace.toDto();
  }
}

export class DeleteNamespaceUseCase {
  constructor(private readonly repository: NamespaceRepository) {}

  async execute(name: string): Promise<void> {
    const deleted = await this.repository.delete(name);
    if (!deleted) {
      throw new NamespaceNotFoundError(name);
    }
  }
}
