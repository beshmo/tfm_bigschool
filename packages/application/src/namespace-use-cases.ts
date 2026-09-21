import { Namespace, NamespaceNotFoundError, ResourceName } from '@okvns/domain';
import type { NamespaceListQuery } from '@okvns/shared';
import type { NamespaceRepository, NamespaceSummary, PageResult } from './ports.js';

export interface CreateNamespaceInput {
  name: unknown;
  description?: unknown;
}

export interface UpdateNamespaceInput {
  name?: unknown;
  description?: unknown;
}

export class CreateNamespaceUseCase {
  constructor(private readonly repository: NamespaceRepository) {}

  async execute(input: CreateNamespaceInput): Promise<Namespace> {
    return this.repository.create(
      Namespace.create({ name: input.name, description: input.description }),
    );
  }
}

export class ListNamespacesUseCase {
  constructor(private readonly repository: NamespaceRepository) {}

  execute(query: NamespaceListQuery): Promise<PageResult<NamespaceSummary>> {
    return this.repository.listNamespaces(query);
  }
}

/** Loads a namespace by (raw) name or throws a validation / not-found error. */
export async function requireNamespace(
  repository: NamespaceRepository,
  rawName: unknown,
): Promise<Namespace> {
  const name = ResourceName.create(rawName, 'Namespace name').value;
  const namespace = await repository.findByName(name);
  if (!namespace) {
    throw new NamespaceNotFoundError(name);
  }
  return namespace;
}

export class GetNamespaceUseCase {
  constructor(private readonly repository: NamespaceRepository) {}

  execute(name: unknown): Promise<Namespace> {
    return requireNamespace(this.repository, name);
  }
}

export class UpdateNamespaceUseCase {
  constructor(private readonly repository: NamespaceRepository) {}

  async execute(name: unknown, input: UpdateNamespaceInput): Promise<Namespace> {
    const current = await requireNamespace(this.repository, name);
    const updated = current.update({ name: input.name, description: input.description });
    return updated.name === current.name
      ? this.repository.save(updated)
      : this.repository.rename(current.name, updated);
  }
}

export class DeleteNamespaceUseCase {
  constructor(private readonly repository: NamespaceRepository) {}

  async execute(rawName: unknown): Promise<void> {
    const name = ResourceName.create(rawName, 'Namespace name').value;
    if (!(await this.repository.delete(name))) {
      throw new NamespaceNotFoundError(name);
    }
  }
}
