import { beforeEach, describe, expect, it } from 'vitest';
import { Entry, Namespace, NamespaceNotFoundError } from '@okvns/domain';
import { YamlError } from '@okvns/yaml';
import { FakeNamespaceRepository } from './testing/fake-namespace-repository.js';
import {
  ExportYamlUseCase,
  ExportNamespaceYamlUseCase,
  ImportYamlUseCase,
} from './yaml-use-cases.js';

let repository: FakeNamespaceRepository;

beforeEach(() => {
  repository = new FakeNamespaceRepository();
});

describe('ImportYamlUseCase', () => {
  it('GIVEN YAML with multiple namespaces WHEN imported THEN all are stored', async () => {
    const yaml = `namespaces:
  - name: users
    entries:
      - name: admin
        value: secret
  - name: settings
    entries: []`;
    const result = await new ImportYamlUseCase(repository).execute(yaml);
    expect(result.map((n) => n.name)).toEqual(['users', 'settings']);
    expect((await repository.findByName('users'))?.getEntry('admin').value).toBe('secret');
    expect(await repository.existsByName('settings')).toBe(true);
  });

  it('GIVEN a namespace that already exists WHEN imported THEN its entries are replaced', async () => {
    const existing = Namespace.create('users');
    existing.addEntry(Entry.create('old', 'value'));
    await repository.save(existing);

    await new ImportYamlUseCase(repository).execute(
      'namespace:\n  name: users\n  entries:\n    - name: fresh\n      value: v',
    );

    const ns = await repository.findByName('users');
    expect(ns?.hasEntry('old')).toBe(false);
    expect(ns?.getEntry('fresh').value).toBe('v');
  });

  it('GIVEN invalid YAML WHEN imported THEN it throws and leaves storage unchanged', async () => {
    await expect(
      new ImportYamlUseCase(repository).execute('unexpected: true'),
    ).rejects.toBeInstanceOf(YamlError);
    expect(await repository.list()).toEqual([]);
  });

  it('GIVEN a document where a later namespace is invalid WHEN imported THEN nothing is applied', async () => {
    const existing = Namespace.create('kept');
    existing.addEntry(Entry.create('a', '1'));
    await repository.save(existing);

    // First namespace is valid; second has a value exceeding the domain limit,
    // which passes YAML schema checks but fails when building the aggregate.
    const oversized = 'x'.repeat(65_537);
    const yaml = `namespaces:
  - name: valid
    entries:
      - name: ok
        value: fine
  - name: broken
    entries:
      - name: toolong
        value: "${oversized}"`;

    await expect(new ImportYamlUseCase(repository).execute(yaml)).rejects.toThrow();
    expect((await repository.list()).map((n) => n.name)).toEqual(['kept']);
    expect(await repository.existsByName('valid')).toBe(false);
  });
});

describe('ExportYamlUseCase', () => {
  it('GIVEN namespaces WHEN exported THEN canonical YAML is produced deterministically', async () => {
    await repository.save(Namespace.create('zeta'));
    await repository.save(Namespace.create('alpha'));
    const yaml = await new ExportYamlUseCase(repository).execute();
    expect(yaml).toContain('namespaces:');
    expect(yaml).not.toContain('```');
    expect(yaml.indexOf('alpha')).toBeLessThan(yaml.indexOf('zeta'));
  });
});

describe('ExportNamespaceYamlUseCase', () => {
  it('GIVEN an existing namespace WHEN exported THEN only that namespace is included', async () => {
    await repository.save(Namespace.create('users'));
    await repository.save(Namespace.create('settings'));
    const yaml = await new ExportNamespaceYamlUseCase(repository).execute('users');
    expect(yaml).toContain('users');
    expect(yaml).not.toContain('settings');
  });

  it('GIVEN a missing namespace WHEN exported THEN it throws NamespaceNotFoundError', async () => {
    await expect(
      new ExportNamespaceYamlUseCase(repository).execute('missing'),
    ).rejects.toBeInstanceOf(NamespaceNotFoundError);
  });
});
