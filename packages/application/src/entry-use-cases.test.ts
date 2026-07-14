import { beforeEach, describe, expect, it } from 'vitest';
import {
  DuplicateEntryError,
  Entry,
  EntryNotFoundError,
  InvalidDescriptionError,
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
  it('GIVEN a valid entry WHEN created THEN it is stored with timestamps', async () => {
    const dto = await new CreateEntryUseCase(repository).execute('users', 'admin', 'secret');
    expect(dto).toMatchObject({ name: 'admin', value: 'secret' });
    expect(dto.created_at).toEqual(expect.any(String));
    expect(dto.modified_at).toEqual(expect.any(String));
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
    await expect(useCase.execute('users', 'admin', 'v2')).rejects.toBeInstanceOf(
      DuplicateEntryError,
    );
  });

  it('GIVEN an invalid entry name WHEN created THEN it throws a validation error', async () => {
    await expect(
      new CreateEntryUseCase(repository).execute('users', 'bad name', 'v'),
    ).rejects.toBeInstanceOf(InvalidResourceNameError);
  });

  it('GIVEN a description WHEN created THEN it is stored and returned', async () => {
    const dto = await new CreateEntryUseCase(repository).execute(
      'users',
      'admin',
      'secret',
      '  the admin key  ',
    );
    expect(dto.description).toBe('the admin key');
    const ns = await repository.findByName('users');
    expect(ns?.getEntry('admin').description).toBe('the admin key');
  });

  it('GIVEN a blank description WHEN created THEN the entry is stored without one', async () => {
    const dto = await new CreateEntryUseCase(repository).execute('users', 'admin', 'v', '   ');
    expect(dto.description).toBeUndefined();
  });

  it('GIVEN an invalid description WHEN created THEN it throws a validation error', async () => {
    await expect(
      new CreateEntryUseCase(repository).execute('users', 'admin', 'v', 'x'.repeat(1001)),
    ).rejects.toBeInstanceOf(InvalidDescriptionError);
    const ns = await repository.findByName('users');
    expect(ns?.hasEntry('admin')).toBe(false);
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
  it('GIVEN an existing entry WHEN retrieved THEN it is returned with timestamps', async () => {
    await new CreateEntryUseCase(repository).execute('users', 'admin', 'v');
    const dto = await new GetEntryUseCase(repository).execute('users', 'admin');
    expect(dto).toMatchObject({ name: 'admin', value: 'v' });
    expect(dto.created_at).toEqual(expect.any(String));
    expect(dto.modified_at).toEqual(expect.any(String));
  });

  it('GIVEN a missing namespace WHEN retrieved THEN it throws NamespaceNotFoundError', async () => {
    await expect(
      new GetEntryUseCase(repository).execute('missing', 'admin'),
    ).rejects.toBeInstanceOf(NamespaceNotFoundError);
  });

  it('GIVEN a missing entry WHEN retrieved THEN it throws EntryNotFoundError', async () => {
    await expect(
      new GetEntryUseCase(repository).execute('users', 'missing'),
    ).rejects.toBeInstanceOf(EntryNotFoundError);
  });
});

describe('UpdateEntryUseCase', () => {
  beforeEach(async () => {
    await new CreateEntryUseCase(repository).execute('users', 'admin', 'original');
  });

  it('GIVEN a value-only change WHEN updated THEN the value changes and name is kept', async () => {
    const dto = await new UpdateEntryUseCase(repository).execute('users', 'admin', {
      value: 'new',
    });
    expect(dto).toMatchObject({ name: 'admin', value: 'new' });
    expect(dto.created_at).toEqual(expect.any(String));
    expect(dto.modified_at).toEqual(expect.any(String));
  });

  it('GIVEN a name-only change WHEN updated THEN the entry is re-keyed and value is kept', async () => {
    const dto = await new UpdateEntryUseCase(repository).execute('users', 'admin', {
      name: 'root',
    });
    expect(dto).toMatchObject({ name: 'root', value: 'original' });
  });

  it('GIVEN both name and value WHEN updated THEN both change', async () => {
    const dto = await new UpdateEntryUseCase(repository).execute('users', 'admin', {
      name: 'root',
      value: 'new',
    });
    expect(dto).toMatchObject({ name: 'root', value: 'new' });
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

  it('GIVEN a description-only change WHEN updated THEN name and value are kept', async () => {
    const dto = await new UpdateEntryUseCase(repository).execute('users', 'admin', {
      description: 'what it does',
    });
    expect(dto).toMatchObject({ name: 'admin', value: 'original', description: 'what it does' });
    const ns = await repository.findByName('users');
    expect(ns?.getEntry('admin').description).toBe('what it does');
  });

  it('GIVEN an entry with a description WHEN updated without one THEN the description is preserved', async () => {
    await new UpdateEntryUseCase(repository).execute('users', 'admin', { description: 'docs' });
    const dto = await new UpdateEntryUseCase(repository).execute('users', 'admin', { value: 'v2' });
    expect(dto).toMatchObject({ value: 'v2', description: 'docs' });
  });

  it('GIVEN a blank description WHEN updated THEN the description is cleared', async () => {
    await new UpdateEntryUseCase(repository).execute('users', 'admin', { description: 'docs' });
    const dto = await new UpdateEntryUseCase(repository).execute('users', 'admin', {
      description: '  ',
    });
    expect(dto.description).toBeUndefined();
  });

  it('GIVEN an invalid description WHEN updated THEN it throws and the entry is unchanged', async () => {
    await expect(
      new UpdateEntryUseCase(repository).execute('users', 'admin', {
        description: 'x'.repeat(1001),
      }),
    ).rejects.toBeInstanceOf(InvalidDescriptionError);
    const ns = await repository.findByName('users');
    expect(ns?.getEntry('admin').value).toBe('original');
  });

  it('GIVEN a description-only change WHEN updated THEN entry and namespace modified_at refresh', async () => {
    const ns = await repository.findByName('users');
    ns!.getEntry('admin').stamp('2020-01-01T00:00:00.000Z', '2020-01-01T00:00:00.000Z');
    ns!.stamp('2020-01-01T00:00:00.000Z', '2020-01-01T00:00:00.000Z');
    const dto = await new UpdateEntryUseCase(repository).execute('users', 'admin', {
      description: 'docs',
    });
    expect(dto.created_at).toBe('2020-01-01T00:00:00.000Z');
    expect(dto.modified_at).not.toBe('2020-01-01T00:00:00.000Z');
    const reloaded = await repository.findByName('users');
    expect(reloaded?.modifiedAt).not.toBe('2020-01-01T00:00:00.000Z');
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
    await expect(
      new DeleteEntryUseCase(repository).execute('missing', 'admin'),
    ).rejects.toBeInstanceOf(NamespaceNotFoundError);
  });

  it('GIVEN a missing entry WHEN deleted THEN it throws EntryNotFoundError', async () => {
    await expect(
      new DeleteEntryUseCase(repository).execute('users', 'missing'),
    ).rejects.toBeInstanceOf(EntryNotFoundError);
  });
});
