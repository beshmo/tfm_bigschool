import {
  EmptyNamespaceUpdateError,
  Namespace,
  NamespaceNotFoundError,
  ResourceName,
} from '@okvns/domain';
import {
  totalPages,
  type NamespaceDto,
  type NamespaceListItemDto,
  type NamespaceListQuery,
  type PaginatedResultDto,
} from '@okvns/shared';
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

  /**
   * Returns one page of namespaces. `query` is expected to already be validated
   * and normalized by the API boundary — the repository maps its sort field and
   * direction onto fixed storage-level fragments, so unvetted values must never
   * reach here.
   */
  async execute(query: NamespaceListQuery): Promise<PaginatedResultDto<NamespaceListItemDto>> {
    const { items, totalItems } = await this.repository.listPage(query);
    return {
      items: items.map((namespace) => ({
        name: namespace.name,
        ...(namespace.description === undefined ? {} : { description: namespace.description }),
        created_at: namespace.createdAt,
        modified_at: namespace.modifiedAt,
      })),
      page: query.page,
      page_size: query.page_size,
      total_items: totalItems,
      total_pages: totalPages(totalItems, query.page_size),
    };
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
