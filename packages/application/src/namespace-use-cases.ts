import { Namespace, NamespaceNotFoundError, ResourceName, compareNames } from '@okvns/domain';
import { type NamespaceDto } from '@okvns/shared';
import { type NamespaceRepository } from './ports.js';

export class CreateNamespaceUseCase {
  constructor(private readonly repository: NamespaceRepository) {}

  async execute(name: unknown): Promise<NamespaceDto> {
    const namespace = Namespace.create(name);
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

  async execute(currentName: string, newName: unknown): Promise<NamespaceDto> {
    const namespace = await this.repository.findByName(currentName);
    if (!namespace) {
      throw new NamespaceNotFoundError(currentName);
    }
    const target = ResourceName.create(newName).value;
    if (target !== namespace.name) {
      // Rename atomically in storage so a partial failure cannot drop the
      // original namespace or leave the target name half-written.
      await this.repository.rename(namespace.name, target);
      namespace.rename(target);
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
