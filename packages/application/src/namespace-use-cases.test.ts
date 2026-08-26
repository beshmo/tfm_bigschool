import { beforeEach, describe, expect, it } from 'vitest';
import {
  DuplicateNamespaceError,
  EmptyNamespaceUpdateError,
  Entry,
  InvalidDescriptionError,
  InvalidResourceNameError,
  Namespace,
  NamespaceNotFoundError,
} from '@okvns/domain';
import type { NamespaceListQuery } from '@okvns/shared';
import { FakeNamespaceRepository } from './testing/fake-namespace-repository.js';
import {
  CreateNamespaceUseCase,
  DeleteNamespaceUseCase,
  GetNamespaceUseCase,
  ListNamespacesUseCase,
  UpdateNamespaceUseCase,
} from './namespace-use-cases.js';

let repository: FakeNamespaceRepository;

beforeEach(() => {
  repository = new FakeNamespaceRepository();
});

describe('CreateNamespaceUseCase', () => {
  it('GIVEN a valid new name WHEN executed THEN it stores and returns the namespace with timestamps', async () => {
    const dto = await new CreateNamespaceUseCase(repository).execute('  users  ');
    expect(dto).toMatchObject({ name: 'users', entries: [] });
    expect(dto.created_at).toEqual(expect.any(String));
    expect(dto.modified_at).toEqual(expect.any(String));
    expect(await repository.existsByName('users')).toBe(true);
  });

  it('GIVEN an invalid name WHEN executed THEN it throws a validation error', async () => {
    await expect(new CreateNamespaceUseCase(repository).execute('bad name')).rejects.toBeInstanceOf(
      InvalidResourceNameError,
    );
  });

  it('GIVEN a description WHEN executed THEN it is stored and returned', async () => {
    const dto = await new CreateNamespaceUseCase(repository).execute('users', '  the users  ');
    expect(dto.description).toBe('the users');
    expect((await repository.findByName('users'))?.description).toBe('the users');
  });

  it('GIVEN a blank description WHEN executed THEN the namespace is stored without one', async () => {
    const dto = await new CreateNamespaceUseCase(repository).execute('users', '   ');
    expect(dto.description).toBeUndefined();
  });

  it('GIVEN an invalid description WHEN executed THEN it throws a validation error', async () => {
    await expect(
      new CreateNamespaceUseCase(repository).execute('users', 'x'.repeat(1001)),
    ).rejects.toBeInstanceOf(InvalidDescriptionError);
    expect(await repository.existsByName('users')).toBe(false);
  });

  it('GIVEN an existing name WHEN executed THEN it throws DuplicateNamespaceError', async () => {
    const useCase = new CreateNamespaceUseCase(repository);
    await useCase.execute('users');
    await expect(useCase.execute('users')).rejects.toBeInstanceOf(DuplicateNamespaceError);
  });
});

describe('ListNamespacesUseCase', () => {
  const query: NamespaceListQuery = {
    page: 1,
    page_size: 10,
    sort: 'name',
    direction: 'asc',
  };

  it('GIVEN namespaces WHEN listed THEN they are returned in name order with page metadata', async () => {
    await repository.save(Namespace.create('zeta'));
    await repository.save(Namespace.create('alpha'));
    const result = await new ListNamespacesUseCase(repository).execute(query);
    expect(result.items.map((n) => n.name)).toEqual(['alpha', 'zeta']);
    expect(result).toMatchObject({ page: 1, page_size: 10, total_items: 2, total_pages: 1 });
  });

  it('GIVEN a namespace WHEN listed THEN the item omits entries and carries its metadata', async () => {
    const namespace = Namespace.create('users', 'the users');
    namespace.addEntry(Entry.create('admin', 'secret'));
    await repository.save(namespace);
    const result = await new ListNamespacesUseCase(repository).execute(query);
    expect(result.items[0]).toEqual({
      name: 'users',
      description: 'the users',
      created_at: expect.any(String),
      modified_at: expect.any(String),
    });
    expect(result.items[0]).not.toHaveProperty('entries');
  });

  it('GIVEN a namespace without a description WHEN listed THEN the field is absent', async () => {
    await repository.save(Namespace.create('users'));
    const result = await new ListNamespacesUseCase(repository).execute(query);
    expect(result.items[0]).not.toHaveProperty('description');
  });

  it('GIVEN more namespaces than fit a page WHEN a later page is listed THEN it reports the full total', async () => {
    for (const name of ['a', 'b', 'c']) {
      await repository.save(Namespace.create(name));
    }
    const result = await new ListNamespacesUseCase(repository).execute({
      ...query,
      page: 2,
      page_size: 10,
    });
    expect(result.items).toEqual([]);
    expect(result).toMatchObject({ page: 2, total_items: 3, total_pages: 1 });
  });

  it('GIVEN no namespaces WHEN listed THEN the page is empty and reports no pages', async () => {
    const result = await new ListNamespacesUseCase(repository).execute(query);
    expect(result).toEqual({
      items: [],
      page: 1,
      page_size: 10,
      total_items: 0,
      total_pages: 0,
    });
  });
});

describe('GetNamespaceUseCase', () => {
  it('GIVEN an existing namespace WHEN retrieved THEN it is returned with timestamps', async () => {
    await repository.save(Namespace.create('users'));
    const dto = await new GetNamespaceUseCase(repository).execute('users');
    expect(dto).toMatchObject({ name: 'users', entries: [] });
    expect(dto.created_at).toEqual(expect.any(String));
    expect(dto.modified_at).toEqual(expect.any(String));
  });

  it('GIVEN a missing namespace WHEN retrieved THEN it throws NamespaceNotFoundError', async () => {
    await expect(new GetNamespaceUseCase(repository).execute('missing')).rejects.toBeInstanceOf(
      NamespaceNotFoundError,
    );
  });
});

describe('UpdateNamespaceUseCase', () => {
  it('GIVEN a valid rename WHEN executed THEN the namespace is re-keyed and entries preserved', async () => {
    const useCase = new UpdateNamespaceUseCase(repository);
    const ns = Namespace.create('users');
    await repository.save(ns);
    const dto = await useCase.execute('users', { name: 'people' });
    expect(dto.name).toBe('people');
    expect(await repository.existsByName('users')).toBe(false);
    expect(await repository.existsByName('people')).toBe(true);
  });

  it('GIVEN a rename to the same name WHEN executed THEN it succeeds without deleting', async () => {
    const useCase = new UpdateNamespaceUseCase(repository);
    await repository.save(Namespace.create('users'));
    const dto = await useCase.execute('users', { name: 'users' });
    expect(dto.name).toBe('users');
    expect(await repository.existsByName('users')).toBe(true);
  });

  it('GIVEN a rename to an existing name WHEN executed THEN it throws DuplicateNamespaceError', async () => {
    const useCase = new UpdateNamespaceUseCase(repository);
    await repository.save(Namespace.create('users'));
    await repository.save(Namespace.create('people'));
    await expect(useCase.execute('users', { name: 'people' })).rejects.toBeInstanceOf(
      DuplicateNamespaceError,
    );
  });

  it('GIVEN a missing namespace WHEN renamed THEN it throws NamespaceNotFoundError', async () => {
    await expect(
      new UpdateNamespaceUseCase(repository).execute('missing', { name: 'x' }),
    ).rejects.toBeInstanceOf(NamespaceNotFoundError);
  });

  it('GIVEN an invalid new name WHEN renamed THEN it throws a validation error', async () => {
    await repository.save(Namespace.create('users'));
    await expect(
      new UpdateNamespaceUseCase(repository).execute('users', { name: 'bad name' }),
    ).rejects.toBeInstanceOf(InvalidResourceNameError);
  });

  it('GIVEN an empty change set WHEN executed THEN it throws EmptyNamespaceUpdateError', async () => {
    await repository.save(Namespace.create('users'));
    await expect(
      new UpdateNamespaceUseCase(repository).execute('users', {}),
    ).rejects.toBeInstanceOf(EmptyNamespaceUpdateError);
  });

  it('GIVEN a description change WHEN executed THEN it is stored and the name is preserved', async () => {
    await repository.save(Namespace.create('users', 'old'));
    const dto = await new UpdateNamespaceUseCase(repository).execute('users', {
      description: 'new',
    });
    expect(dto).toMatchObject({ name: 'users', description: 'new' });
    expect((await repository.findByName('users'))?.description).toBe('new');
  });

  it('GIVEN a blank description WHEN executed THEN the description is cleared', async () => {
    await repository.save(Namespace.create('users', 'old'));
    const dto = await new UpdateNamespaceUseCase(repository).execute('users', {
      description: '  ',
    });
    expect(dto.description).toBeUndefined();
    expect((await repository.findByName('users'))?.description).toBeUndefined();
  });

  it('GIVEN an invalid description WHEN executed THEN it throws before renaming', async () => {
    await repository.save(Namespace.create('users'));
    await expect(
      new UpdateNamespaceUseCase(repository).execute('users', {
        name: 'people',
        description: 'x'.repeat(1001),
      }),
    ).rejects.toBeInstanceOf(InvalidDescriptionError);
    expect(await repository.existsByName('users')).toBe(true);
    expect(await repository.existsByName('people')).toBe(false);
  });

  it('GIVEN a name and description change WHEN executed THEN both are applied', async () => {
    await repository.save(Namespace.create('users', 'old'));
    const dto = await new UpdateNamespaceUseCase(repository).execute('users', {
      name: 'people',
      description: 'new',
    });
    expect(dto).toMatchObject({ name: 'people', description: 'new' });
    expect((await repository.findByName('people'))?.description).toBe('new');
  });

  it('GIVEN a description-only change WHEN executed THEN the namespace modified_at refreshes', async () => {
    const ns = Namespace.create('users');
    ns.stamp('2020-01-01T00:00:00.000Z', '2020-01-01T00:00:00.000Z');
    await repository.save(ns);
    const dto = await new UpdateNamespaceUseCase(repository).execute('users', {
      description: 'new',
    });
    expect(dto.created_at).toBe('2020-01-01T00:00:00.000Z');
    expect(dto.modified_at).not.toBe('2020-01-01T00:00:00.000Z');
  });
});

describe('DeleteNamespaceUseCase', () => {
  it('GIVEN an existing namespace WHEN deleted THEN it is removed', async () => {
    await repository.save(Namespace.create('users'));
    await new DeleteNamespaceUseCase(repository).execute('users');
    expect(await repository.existsByName('users')).toBe(false);
  });

  it('GIVEN a missing namespace WHEN deleted THEN it throws NamespaceNotFoundError', async () => {
    await expect(new DeleteNamespaceUseCase(repository).execute('missing')).rejects.toBeInstanceOf(
      NamespaceNotFoundError,
    );
  });
});
