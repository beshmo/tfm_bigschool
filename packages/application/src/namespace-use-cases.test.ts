import {
  DuplicateNamespaceError,
  EmptyNamespaceUpdateError,
  InvalidResourceNameError,
  NamespaceNotFoundError,
} from '@okvns/domain';
import { beforeEach, describe, expect, it } from 'vitest';
import {
  CreateNamespaceUseCase,
  DeleteNamespaceUseCase,
  GetNamespaceUseCase,
  ListNamespacesUseCase,
  UpdateNamespaceUseCase,
} from './namespace-use-cases.js';
import { FakeNamespaceRepository } from './testing/fake-namespace-repository.js';
import { entry, namespace, namespaceQuery, steppingClock } from './testing/helpers.js';

let repository: FakeNamespaceRepository;

beforeEach(() => {
  repository = new FakeNamespaceRepository(steppingClock());
});

describe('CreateNamespaceUseCase', () => {
  it('GIVEN a valid name and description WHEN created THEN the namespace is stored with timestamps', async () => {
    const created = await new CreateNamespaceUseCase(repository).execute({
      name: ' billing ',
      description: ' Billing settings ',
    });

    expect(created.name).toBe('billing');
    expect(created.description).toBe('Billing settings');
    expect(created.createdAt).toBeInstanceOf(Date);
    expect(created.modifiedAt).toBeInstanceOf(Date);
    expect(await repository.findByName('billing')).toBeDefined();
  });

  it('GIVEN a blank description WHEN created THEN the namespace has none', async () => {
    const created = await new CreateNamespaceUseCase(repository).execute({
      name: 'a',
      description: '   ',
    });

    expect(created.description).toBeUndefined();
  });

  it('GIVEN an existing name WHEN created THEN a duplicate error leaves the original unchanged', async () => {
    const useCase = new CreateNamespaceUseCase(repository);
    await useCase.execute({ name: 'a', description: 'original' });

    await expect(useCase.execute({ name: 'a', description: 'other' })).rejects.toBeInstanceOf(
      DuplicateNamespaceError,
    );
    expect((await repository.findByName('a'))?.description).toBe('original');
  });

  it('GIVEN an invalid name WHEN created THEN nothing is stored', async () => {
    await expect(
      new CreateNamespaceUseCase(repository).execute({ name: '' }),
    ).rejects.toBeInstanceOf(InvalidResourceNameError);
    expect(repository.writes).toBe(0);
  });
});

describe('ListNamespacesUseCase', () => {
  it('GIVEN stored namespaces WHEN listed THEN a page of summaries is returned', async () => {
    await repository.create(namespace('b', [entry('k')]));
    await repository.create(namespace('a'));

    const page = await new ListNamespacesUseCase(repository).execute(namespaceQuery());

    expect(page.items.map((item) => item.name)).toEqual(['a', 'b']);
    expect(page.totalItems).toBe(2);
    expect('entries' in page.items[0]!).toBe(false);
  });
});

describe('GetNamespaceUseCase', () => {
  it('GIVEN an existing namespace WHEN fetched THEN it is returned with its entries', async () => {
    await repository.create(namespace('a', [entry('k')]));

    expect((await new GetNamespaceUseCase(repository).execute(' a ')).entries).toHaveLength(1);
  });

  it('GIVEN a missing namespace WHEN fetched THEN a not-found error is thrown', async () => {
    await expect(new GetNamespaceUseCase(repository).execute('missing')).rejects.toBeInstanceOf(
      NamespaceNotFoundError,
    );
  });

  it('GIVEN an invalid name WHEN fetched THEN a validation error is thrown', async () => {
    await expect(new GetNamespaceUseCase(repository).execute('bad name')).rejects.toBeInstanceOf(
      InvalidResourceNameError,
    );
  });
});

describe('UpdateNamespaceUseCase', () => {
  it('GIVEN a new unused name WHEN renamed THEN entries and description move with it', async () => {
    const created = await repository.create(namespace('old', [entry('k')], { description: 'd' }));

    const renamed = await new UpdateNamespaceUseCase(repository).execute('old', { name: 'new' });

    expect(renamed.name).toBe('new');
    expect(renamed.description).toBe('d');
    expect(renamed.entries).toHaveLength(1);
    expect(renamed.createdAt).toEqual(created.createdAt);
    expect(renamed.modifiedAt!.getTime()).toBeGreaterThan(created.modifiedAt!.getTime());
    expect(await repository.findByName('old')).toBeUndefined();
  });

  it('GIVEN a description only WHEN updated THEN the namespace keeps its name and entries', async () => {
    const created = await repository.create(namespace('a', [entry('k')]));

    const updated = await new UpdateNamespaceUseCase(repository).execute('a', {
      description: ' new ',
    });

    expect(updated.description).toBe('new');
    expect(updated.entries).toHaveLength(1);
    expect(updated.createdAt).toEqual(created.createdAt);
    expect(updated.modifiedAt!.getTime()).toBeGreaterThan(created.modifiedAt!.getTime());
  });

  it('GIVEN a blank description WHEN updated THEN the description is cleared', async () => {
    await repository.create(namespace('a', [], { description: 'd' }));

    expect(
      (await new UpdateNamespaceUseCase(repository).execute('a', { description: '  ' }))
        .description,
    ).toBeUndefined();
  });

  it('GIVEN a name used by another namespace WHEN renamed THEN neither namespace changes', async () => {
    await repository.create(namespace('a'));
    await repository.create(namespace('b'));

    await expect(
      new UpdateNamespaceUseCase(repository).execute('a', { name: 'b' }),
    ).rejects.toBeInstanceOf(DuplicateNamespaceError);
    expect(await repository.findByName('a')).toBeDefined();
    expect(await repository.findByName('b')).toBeDefined();
  });

  it('GIVEN an empty update WHEN applied THEN a validation error is thrown', async () => {
    await repository.create(namespace('a'));

    await expect(new UpdateNamespaceUseCase(repository).execute('a', {})).rejects.toBeInstanceOf(
      EmptyNamespaceUpdateError,
    );
  });

  it('GIVEN a missing namespace WHEN updated THEN a not-found error is thrown', async () => {
    await expect(
      new UpdateNamespaceUseCase(repository).execute('missing', { name: 'x' }),
    ).rejects.toBeInstanceOf(NamespaceNotFoundError);
  });
});

describe('DeleteNamespaceUseCase', () => {
  it('GIVEN an existing namespace WHEN deleted THEN it and its entries are gone', async () => {
    await repository.create(namespace('a', [entry('k')]));

    await new DeleteNamespaceUseCase(repository).execute('a');

    expect(await repository.findByName('a')).toBeUndefined();
  });

  it('GIVEN a missing namespace WHEN deleted THEN a not-found error is thrown', async () => {
    await expect(new DeleteNamespaceUseCase(repository).execute('missing')).rejects.toBeInstanceOf(
      NamespaceNotFoundError,
    );
  });

  it('GIVEN an invalid name WHEN deleted THEN a validation error is thrown', async () => {
    await expect(new DeleteNamespaceUseCase(repository).execute('')).rejects.toBeInstanceOf(
      InvalidResourceNameError,
    );
  });
});
