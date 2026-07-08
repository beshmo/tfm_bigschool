import { beforeEach, describe, expect, it } from 'vitest';
import { Entry, Namespace, NamespaceNotFoundError } from '@okvns/domain';
import { MarkdownError } from '@okvns/markdown';
import { FakeNamespaceRepository } from './testing/fake-namespace-repository.js';
import {
  ExportMarkdownUseCase,
  ExportNamespaceMarkdownUseCase,
  ImportMarkdownUseCase,
} from './markdown-use-cases.js';

let repository: FakeNamespaceRepository;

beforeEach(() => {
  repository = new FakeNamespaceRepository();
});

describe('ImportMarkdownUseCase', () => {
  it('GIVEN markdown with multiple namespaces WHEN imported THEN all are stored', async () => {
    const md = `namespaces:
  - name: users
    entries:
      - name: admin
        value: secret
  - name: settings
    entries: []`;
    const result = await new ImportMarkdownUseCase(repository).execute(md);
    expect(result.map((n) => n.name)).toEqual(['users', 'settings']);
    expect((await repository.findByName('users'))?.getEntry('admin').value).toBe('secret');
    expect(await repository.existsByName('settings')).toBe(true);
  });

  it('GIVEN a namespace that already exists WHEN imported THEN its entries are replaced', async () => {
    const existing = Namespace.create('users');
    existing.addEntry(Entry.create('old', 'value'));
    await repository.save(existing);

    await new ImportMarkdownUseCase(repository).execute(
      'namespace:\n  name: users\n  entries:\n    - name: fresh\n      value: v',
    );

    const ns = await repository.findByName('users');
    expect(ns?.hasEntry('old')).toBe(false);
    expect(ns?.getEntry('fresh').value).toBe('v');
  });

  it('GIVEN invalid markdown WHEN imported THEN it throws and leaves storage unchanged', async () => {
    await expect(
      new ImportMarkdownUseCase(repository).execute('unexpected: true'),
    ).rejects.toBeInstanceOf(MarkdownError);
    expect(await repository.list()).toEqual([]);
  });

  it('GIVEN a document where a later namespace is invalid WHEN imported THEN nothing is applied', async () => {
    const existing = Namespace.create('kept');
    existing.addEntry(Entry.create('a', '1'));
    await repository.save(existing);

    // First namespace is valid; second has a value exceeding the domain limit,
    // which passes markdown schema checks but fails when building the aggregate.
    const oversized = 'x'.repeat(65_537);
    const md = `namespaces:
  - name: valid
    entries:
      - name: ok
        value: fine
  - name: broken
    entries:
      - name: toolong
        value: "${oversized}"`;

    await expect(new ImportMarkdownUseCase(repository).execute(md)).rejects.toThrow();
    expect((await repository.list()).map((n) => n.name)).toEqual(['kept']);
    expect(await repository.existsByName('valid')).toBe(false);
  });
});

describe('ExportMarkdownUseCase', () => {
  it('GIVEN namespaces WHEN exported THEN canonical markdown is produced deterministically', async () => {
    await repository.save(Namespace.create('zeta'));
    await repository.save(Namespace.create('alpha'));
    const markdown = await new ExportMarkdownUseCase(repository).execute();
    expect(markdown).toContain('namespaces:');
    expect(markdown.indexOf('alpha')).toBeLessThan(markdown.indexOf('zeta'));
  });
});

describe('ExportNamespaceMarkdownUseCase', () => {
  it('GIVEN an existing namespace WHEN exported THEN only that namespace is included', async () => {
    await repository.save(Namespace.create('users'));
    await repository.save(Namespace.create('settings'));
    const markdown = await new ExportNamespaceMarkdownUseCase(repository).execute('users');
    expect(markdown).toContain('users');
    expect(markdown).not.toContain('settings');
  });

  it('GIVEN a missing namespace WHEN exported THEN it throws NamespaceNotFoundError', async () => {
    await expect(
      new ExportNamespaceMarkdownUseCase(repository).execute('missing'),
    ).rejects.toBeInstanceOf(NamespaceNotFoundError);
  });
});
