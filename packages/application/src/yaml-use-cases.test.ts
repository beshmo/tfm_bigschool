import { NamespaceNotFoundError } from '@okvns/domain';
import { YamlError } from '@okvns/yaml';
import { beforeEach, describe, expect, it } from 'vitest';
import {
  ExportNamespaceYamlUseCase,
  ExportYamlUseCase,
  ImportYamlUseCase,
} from './yaml-use-cases.js';
import { FakeNamespaceRepository } from './testing/fake-namespace-repository.js';
import { entry, namespace, steppingClock } from './testing/helpers.js';

let repository: FakeNamespaceRepository;

beforeEach(() => {
  repository = new FakeNamespaceRepository(steppingClock());
});

const YAML = `namespaces:
  - name: alpha
    description: first
    entries:
      - name: admin
        value: secret
        description: the key
        env_dependent: true
  - name: beta
    entries:
      - name: token
        value: abc
`;

describe('ImportYamlUseCase', () => {
  it('GIVEN valid YAML WHEN imported THEN every namespace, entry and metadata is stored', async () => {
    const imported = await new ImportYamlUseCase(repository).execute(YAML);

    expect(imported.map((item) => item.name)).toEqual(['alpha', 'beta']);
    const alpha = await repository.findByName('alpha');
    expect(alpha?.description).toBe('first');
    expect(alpha?.getEntry('admin')).toMatchObject({
      value: 'secret',
      description: 'the key',
      envDependent: true,
    });
    expect((await repository.findByName('beta'))?.getEntry('token').envDependent).toBe(false);
  });

  it('GIVEN an existing namespace WHEN imported THEN its entries are replaced', async () => {
    await repository.create(namespace('alpha', [entry('stale'), entry('admin', 'old')]));

    await new ImportYamlUseCase(repository).execute(YAML);

    const alpha = await repository.findByName('alpha');
    expect(alpha?.entries.map((item) => item.name)).toEqual(['admin']);
    expect(alpha?.getEntry('admin').value).toBe('secret');
  });

  it('GIVEN an existing namespace WHEN imported THEN it keeps its creation time', async () => {
    const original = await repository.create(namespace('alpha'));

    await new ImportYamlUseCase(repository).execute(YAML);

    expect((await repository.findByName('alpha'))?.createdAt).toEqual(original.createdAt);
  });

  it('GIVEN YAML with an invalid namespace WHEN imported THEN nothing is written', async () => {
    const bad = `namespaces:
  - name: good
    entries: []
  - name: "!"
    entries: []
`;

    await expect(new ImportYamlUseCase(repository).execute(bad)).rejects.toBeInstanceOf(YamlError);
    expect(repository.writes).toBe(0);
    expect(await repository.listAll()).toEqual([]);
  });

  it('GIVEN an invalid entry after a valid namespace WHEN imported THEN existing data is untouched', async () => {
    await repository.create(namespace('alpha', [entry('keep')]));
    const writes = repository.writes;

    await expect(
      new ImportYamlUseCase(repository).execute(
        'namespaces:\n  - name: alpha\n    entries:\n      - name: k\n        value: 5\n',
      ),
    ).rejects.toBeInstanceOf(YamlError);
    expect(repository.writes).toBe(writes);
    expect((await repository.findByName('alpha'))?.hasEntry('keep')).toBe(true);
  });
});

describe('ExportYamlUseCase', () => {
  it('GIVEN stored namespaces WHEN exported THEN canonical YAML with timestamps is returned', async () => {
    await new ImportYamlUseCase(repository).execute(YAML);

    const yaml = await new ExportYamlUseCase(repository).execute();

    expect(yaml.startsWith('namespaces:\n')).toBe(true);
    expect(yaml).toContain('name: alpha');
    expect(yaml).toContain('name: beta');
    expect(yaml).toContain('description: first');
    expect(yaml).toContain('env_dependent: true');
    expect(yaml).toContain('env_dependent: false');
    expect(yaml).toContain('created_at: 2026-01-01T');
    expect(yaml).toContain('modified_at: 2026-01-01T');
    expect(yaml).not.toContain('```');
  });

  it('GIVEN exported YAML WHEN re-imported THEN the same data is stored', async () => {
    await new ImportYamlUseCase(repository).execute(YAML);
    const exported = await new ExportYamlUseCase(repository).execute();
    const other = new FakeNamespaceRepository(steppingClock());

    await new ImportYamlUseCase(other).execute(exported);

    expect((await other.listAll()).map((item) => item.name)).toEqual(['alpha', 'beta']);
    expect((await other.findByName('alpha'))?.getEntry('admin').description).toBe('the key');
  });

  it('GIVEN no namespaces WHEN exported THEN an empty list is returned', async () => {
    expect(await new ExportYamlUseCase(repository).execute()).toBe('namespaces: []\n');
  });
});

describe('ExportNamespaceYamlUseCase', () => {
  it('GIVEN a namespace WHEN exported by name THEN only that namespace is included', async () => {
    await new ImportYamlUseCase(repository).execute(YAML);

    const yaml = await new ExportNamespaceYamlUseCase(repository).execute('alpha');

    expect(yaml).toContain('name: alpha');
    expect(yaml).not.toContain('name: beta');
  });

  it('GIVEN a missing namespace WHEN exported THEN a not-found error is thrown', async () => {
    await expect(new ExportNamespaceYamlUseCase(repository).execute('nope')).rejects.toBeInstanceOf(
      NamespaceNotFoundError,
    );
  });
});
