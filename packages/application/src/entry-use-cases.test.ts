import {
  DuplicateEntryError,
  EntryNotFoundError,
  InvalidDescriptionError,
  InvalidEnvDependentError,
  NamespaceNotFoundError,
} from '@okvns/domain';
import { beforeEach, describe, expect, it } from 'vitest';
import {
  CreateEntryUseCase,
  DeleteEntryUseCase,
  GetEntryUseCase,
  ListEntriesUseCase,
  UpdateEntryUseCase,
} from './entry-use-cases.js';
import { FakeNamespaceRepository } from './testing/fake-namespace-repository.js';
import { entry, entryQuery, namespace, steppingClock } from './testing/helpers.js';

let repository: FakeNamespaceRepository;

beforeEach(async () => {
  repository = new FakeNamespaceRepository(steppingClock());
  await repository.create(namespace('ns', [entry('existing', 'old', { description: 'doc' })]));
});

describe('CreateEntryUseCase', () => {
  it('GIVEN a valid entry WHEN created THEN it is stored with defaults and timestamps', async () => {
    const created = await new CreateEntryUseCase(repository).execute('ns', {
      name: 'key',
      value: 'v',
    });

    expect(created.envDependent).toBe(false);
    expect(created.description).toBeUndefined();
    expect(created.createdAt).toBeInstanceOf(Date);
    expect(created.modifiedAt).toBeInstanceOf(Date);
    expect((await repository.findByName('ns'))?.entries).toHaveLength(2);
  });

  it('GIVEN a description and env marker WHEN created THEN both are stored', async () => {
    const created = await new CreateEntryUseCase(repository).execute('ns', {
      name: 'key',
      value: 'v',
      description: ' note ',
      envDependent: true,
    });

    expect(created.description).toBe('note');
    expect(created.envDependent).toBe(true);
  });

  it('GIVEN an entry WHEN created THEN the namespace modification time moves', async () => {
    const before = (await repository.findByName('ns'))!.modifiedAt!;

    await new CreateEntryUseCase(repository).execute('ns', { name: 'key', value: 'v' });

    expect((await repository.findByName('ns'))!.modifiedAt!.getTime()).toBeGreaterThan(
      before.getTime(),
    );
  });

  it('GIVEN an existing entry name WHEN created THEN a duplicate error leaves it unchanged', async () => {
    await expect(
      new CreateEntryUseCase(repository).execute('ns', { name: 'existing', value: 'new' }),
    ).rejects.toBeInstanceOf(DuplicateEntryError);
    expect((await repository.findByName('ns'))?.getEntry('existing').value).toBe('old');
  });

  it('GIVEN a missing namespace WHEN an entry is created THEN a not-found error is thrown', async () => {
    await expect(
      new CreateEntryUseCase(repository).execute('missing', { name: 'k', value: 'v' }),
    ).rejects.toBeInstanceOf(NamespaceNotFoundError);
  });

  it('GIVEN invalid fields WHEN created THEN validation errors are thrown', async () => {
    const useCase = new CreateEntryUseCase(repository);

    await expect(
      useCase.execute('ns', { name: 'k', value: 'v', description: 5 }),
    ).rejects.toBeInstanceOf(InvalidDescriptionError);
    await expect(
      useCase.execute('ns', { name: 'k', value: 'v', envDependent: 'yes' }),
    ).rejects.toBeInstanceOf(InvalidEnvDependentError);
  });
});

describe('ListEntriesUseCase', () => {
  it('GIVEN entries WHEN listed THEN a page is returned', async () => {
    const page = await new ListEntriesUseCase(repository).execute('ns', entryQuery());

    expect(page.items.map((item) => item.name)).toEqual(['existing']);
    expect(page.totalItems).toBe(1);
  });

  it('GIVEN a missing namespace WHEN listed THEN a not-found error is thrown', async () => {
    await expect(
      new ListEntriesUseCase(repository).execute('missing', entryQuery()),
    ).rejects.toBeInstanceOf(NamespaceNotFoundError);
  });
});

describe('GetEntryUseCase', () => {
  it('GIVEN an existing entry WHEN fetched THEN it is returned', async () => {
    expect((await new GetEntryUseCase(repository).execute('ns', 'existing')).value).toBe('old');
  });

  it('GIVEN a missing entry WHEN fetched THEN a not-found error is thrown', async () => {
    await expect(new GetEntryUseCase(repository).execute('ns', 'nope')).rejects.toBeInstanceOf(
      EntryNotFoundError,
    );
  });

  it('GIVEN a missing namespace WHEN fetched THEN a namespace not-found error is thrown', async () => {
    await expect(new GetEntryUseCase(repository).execute('missing', 'k')).rejects.toBeInstanceOf(
      NamespaceNotFoundError,
    );
  });
});

describe('UpdateEntryUseCase', () => {
  it('GIVEN a value change WHEN updated THEN creation stays and modification moves', async () => {
    const before = (await repository.findByName('ns'))!.getEntry('existing');

    const updated = await new UpdateEntryUseCase(repository).execute('ns', 'existing', {
      value: 'new',
    });

    expect(updated.value).toBe('new');
    expect(updated.description).toBe('doc');
    expect(updated.createdAt).toEqual(before.createdAt);
    expect(updated.modifiedAt!.getTime()).toBeGreaterThan(before.modifiedAt!.getTime());
  });

  it('GIVEN a rename WHEN updated THEN the entry keeps its creation time under the new name', async () => {
    const before = (await repository.findByName('ns'))!.getEntry('existing');

    const updated = await new UpdateEntryUseCase(repository).execute('ns', 'existing', {
      name: 'renamed',
    });

    expect(updated.name).toBe('renamed');
    expect(updated.createdAt).toEqual(before.createdAt);
    expect((await repository.findByName('ns'))?.hasEntry('existing')).toBe(false);
  });

  it('GIVEN only the env marker WHEN updated THEN the other fields are preserved', async () => {
    const updated = await new UpdateEntryUseCase(repository).execute('ns', 'existing', {
      envDependent: true,
    });

    expect(updated.envDependent).toBe(true);
    expect(updated.value).toBe('old');
    expect(updated.description).toBe('doc');
  });

  it('GIVEN a blank description WHEN updated THEN the description is cleared', async () => {
    const updated = await new UpdateEntryUseCase(repository).execute('ns', 'existing', {
      description: '   ',
    });

    expect(updated.description).toBeUndefined();
  });

  it('GIVEN a name used by another entry WHEN renamed THEN a duplicate error changes nothing', async () => {
    await new CreateEntryUseCase(repository).execute('ns', { name: 'other', value: 'x' });

    await expect(
      new UpdateEntryUseCase(repository).execute('ns', 'existing', { name: 'other' }),
    ).rejects.toBeInstanceOf(DuplicateEntryError);
    expect((await repository.findByName('ns'))?.getEntry('existing').value).toBe('old');
  });

  it('GIVEN a missing entry WHEN updated THEN a not-found error is thrown', async () => {
    await expect(
      new UpdateEntryUseCase(repository).execute('ns', 'nope', { value: 'x' }),
    ).rejects.toBeInstanceOf(EntryNotFoundError);
  });
});

describe('DeleteEntryUseCase', () => {
  it('GIVEN an existing entry WHEN deleted THEN it is gone and the namespace remains', async () => {
    await new DeleteEntryUseCase(repository).execute('ns', 'existing');

    const stored = await repository.findByName('ns');
    expect(stored).toBeDefined();
    expect(stored?.entries).toHaveLength(0);
  });

  it('GIVEN a missing entry WHEN deleted THEN a not-found error is thrown', async () => {
    await expect(new DeleteEntryUseCase(repository).execute('ns', 'nope')).rejects.toBeInstanceOf(
      EntryNotFoundError,
    );
  });
});
