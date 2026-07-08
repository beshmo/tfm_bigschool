import { beforeEach, describe, expect, it } from 'vitest';
import {
  DuplicateEntryError,
  Entry,
  EntryNotFoundError,
  InvalidResourceNameError,
  Namespace,
  NamespaceNotFoundError,
} from '@okvns/domain';
import { FakeNamespaceRepository } from './testing/fake-namespace-repository.js';
import {
  CreateEntryUseCase,
  DeleteEntryUseCase,
  GetEntryUseCase,
  ListEntriesUseCase,
  UpdateEntryUseCase,
} from './entry-use-cases.js';

let repository: FakeNamespaceRepository;

beforeEach(async () => {
  repository = new FakeNamespaceRepository();
  await repository.save(Namespace.create('users'));
});

describe('CreateEntryUseCase', () => {
  it('GIVEN a valid entry WHEN created THEN it is stored', async () => {
    const dto = await new CreateEntryUseCase(repository).execute('users', 'admin', 'secret');
    expect(dto).toEqual({ name: 'admin', value: 'secret' });
    const ns = await repository.findByName('users');
    expect(ns?.getEntry('admin').value).toBe('secret');
  });

  it('GIVEN a missing namespace WHEN created THEN it throws NamespaceNotFoundError', async () => {
    await expect(
      new CreateEntryUseCase(repository).execute('missing', 'admin', 'v'),
    ).rejects.toBeInstanceOf(NamespaceNotFoundError);
  });

  it('GIVEN a duplicate entry WHEN created THEN it throws DuplicateEntryError', async () => {
    const useCase = new CreateEntryUseCase(repository);
    await useCase.execute('users', 'admin', 'v');
    await expect(useCase.execute('users', 'admin', 'v2')).rejects.toBeInstanceOf(DuplicateEntryError);
  });

  it('GIVEN an invalid entry name WHEN created THEN it throws a validation error', async () => {
    await expect(
      new CreateEntryUseCase(repository).execute('users', 'bad name', 'v'),
    ).rejects.toBeInstanceOf(InvalidResourceNameError);
  });
});

describe('ListEntriesUseCase', () => {
  it('GIVEN entries WHEN listed THEN they are returned in name order', async () => {
    const ns = await repository.findByName('users');
    ns!.addEntry(Entry.create('zeta', '1'));
    ns!.addEntry(Entry.create('alpha', '2'));
    const result = await new ListEntriesUseCase(repository).execute('users');
    expect(result.map((e) => e.name)).toEqual(['alpha', 'zeta']);
  });

  it('GIVEN a missing namespace WHEN listed THEN it throws NamespaceNotFoundError', async () => {
    await expect(new ListEntriesUseCase(repository).execute('missing')).rejects.toBeInstanceOf(
      NamespaceNotFoundError,
    );
  });
});

describe('GetEntryUseCase', () => {
  it('GIVEN an existing entry WHEN retrieved THEN it is returned', async () => {
    await new CreateEntryUseCase(repository).execute('users', 'admin', 'v');
    expect(await new GetEntryUseCase(repository).execute('users', 'admin')).toEqual({
      name: 'admin',
      value: 'v',
    });
  });

  it('GIVEN a missing namespace WHEN retrieved THEN it throws NamespaceNotFoundError', async () => {
    await expect(new GetEntryUseCase(repository).execute('missing', 'admin')).rejects.toBeInstanceOf(
      NamespaceNotFoundError,
    );
  });

  it('GIVEN a missing entry WHEN retrieved THEN it throws EntryNotFoundError', async () => {
    await expect(new GetEntryUseCase(repository).execute('users', 'missing')).rejects.toBeInstanceOf(
      EntryNotFoundError,
    );
  });
});

describe('UpdateEntryUseCase', () => {
  beforeEach(async () => {
    await new CreateEntryUseCase(repository).execute('users', 'admin', 'original');
  });

  it('GIVEN a value-only change WHEN updated THEN the value changes and name is kept', async () => {
    const dto = await new UpdateEntryUseCase(repository).execute('users', 'admin', { value: 'new' });
    expect(dto).toEqual({ name: 'admin', value: 'new' });
  });

  it('GIVEN a name-only change WHEN updated THEN the entry is re-keyed and value is kept', async () => {
    const dto = await new UpdateEntryUseCase(repository).execute('users', 'admin', { name: 'root' });
    expect(dto).toEqual({ name: 'root', value: 'original' });
  });

  it('GIVEN both name and value WHEN updated THEN both change', async () => {
    const dto = await new UpdateEntryUseCase(repository).execute('users', 'admin', {
      name: 'root',
      value: 'new',
    });
    expect(dto).toEqual({ name: 'root', value: 'new' });
  });

  it('GIVEN a rename to an existing entry WHEN updated THEN it throws DuplicateEntryError', async () => {
    await new CreateEntryUseCase(repository).execute('users', 'guest', 'g');
    await expect(
      new UpdateEntryUseCase(repository).execute('users', 'admin', { name: 'guest' }),
    ).rejects.toBeInstanceOf(DuplicateEntryError);
  });

  it('GIVEN a missing namespace WHEN updated THEN it throws NamespaceNotFoundError', async () => {
    await expect(
      new UpdateEntryUseCase(repository).execute('missing', 'admin', { value: 'v' }),
    ).rejects.toBeInstanceOf(NamespaceNotFoundError);
  });

  it('GIVEN a missing entry WHEN updated THEN it throws EntryNotFoundError', async () => {
    await expect(
      new UpdateEntryUseCase(repository).execute('users', 'missing', { value: 'v' }),
    ).rejects.toBeInstanceOf(EntryNotFoundError);
  });
});

describe('DeleteEntryUseCase', () => {
  it('GIVEN an existing entry WHEN deleted THEN it is removed and the namespace remains', async () => {
    await new CreateEntryUseCase(repository).execute('users', 'admin', 'v');
    await new DeleteEntryUseCase(repository).execute('users', 'admin');
    const ns = await repository.findByName('users');
    expect(ns?.hasEntry('admin')).toBe(false);
  });

  it('GIVEN a missing namespace WHEN deleted THEN it throws NamespaceNotFoundError', async () => {
    await expect(new DeleteEntryUseCase(repository).execute('missing', 'admin')).rejects.toBeInstanceOf(
      NamespaceNotFoundError,
    );
  });

  it('GIVEN a missing entry WHEN deleted THEN it throws EntryNotFoundError', async () => {
    await expect(new DeleteEntryUseCase(repository).execute('users', 'missing')).rejects.toBeInstanceOf(
      EntryNotFoundError,
    );
  });
});
