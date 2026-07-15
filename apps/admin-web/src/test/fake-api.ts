import type { EntryDto, NamespaceDto } from '@okvns/shared';
import { DESCRIPTION_MAX_LENGTH, compareNames } from '@okvns/shared';
import { ApiError } from '../api/api-error';
import type { EntryChangesInput, NamespaceChangesInput, OkvnsApi } from '../api/okvns-api';

interface FakeEntry {
  value: string;
  description?: string;
  env_dependent: boolean;
  created_at: string;
  modified_at: string;
}

interface FakeNamespace {
  description?: string;
  created_at: string;
  modified_at: string;
  entries: Map<string, FakeEntry>;
}

/** Namespace seed fixture; timestamps are optional and default when omitted. */
export interface SeedNamespace {
  name: string;
  description?: string;
  entries: Array<{
    name: string;
    value: string;
    description?: string;
    env_dependent?: boolean;
    created_at?: string;
    modified_at?: string;
  }>;
  created_at?: string;
  modified_at?: string;
}

/** Mirrors the server's blank-to-absent description normalization. */
function normalize(description: string | undefined): string | undefined {
  const trimmed = description?.trim();
  return trimmed ? trimmed : undefined;
}

const DEFAULT_TS = '2024-01-01T00:00:00.000Z';

/**
 * In-memory OkvnsApi used by component tests. Mirrors the server's behavior
 * closely enough to exercise UI flows and error display without a real backend,
 * including namespace and entry `created_at`/`modified_at` timestamp metadata.
 */
export class FakeOkvnsApi implements OkvnsApi {
  private readonly namespaces = new Map<string, FakeNamespace>();
  private tick = 0;

  /** A strictly-increasing synthetic timestamp for mutations. */
  private now(): string {
    return new Date(Date.UTC(2025, 0, 1, 0, 0, this.tick++)).toISOString();
  }

  seed(namespaces: SeedNamespace[]): void {
    for (const ns of namespaces) {
      this.namespaces.set(ns.name, {
        description: normalize(ns.description),
        created_at: ns.created_at ?? DEFAULT_TS,
        modified_at: ns.modified_at ?? DEFAULT_TS,
        entries: new Map(
          ns.entries.map((e) => [
            e.name,
            {
              value: e.value,
              description: normalize(e.description),
              env_dependent: e.env_dependent ?? false,
              created_at: e.created_at ?? DEFAULT_TS,
              modified_at: e.modified_at ?? DEFAULT_TS,
            },
          ]),
        ),
      });
    }
  }

  private toDto(name: string): NamespaceDto {
    const namespace = this.namespaces.get(name)!;
    return {
      name,
      ...(namespace.description === undefined ? {} : { description: namespace.description }),
      created_at: namespace.created_at,
      modified_at: namespace.modified_at,
      entries: [...namespace.entries.entries()]
        .map(([entryName, entry]) => ({
          name: entryName,
          value: entry.value,
          ...(entry.description === undefined ? {} : { description: entry.description }),
          env_dependent: entry.env_dependent,
          created_at: entry.created_at,
          modified_at: entry.modified_at,
        }))
        .sort((a, b) => compareNames(a.name, b.name)),
    };
  }

  async listNamespaces(): Promise<NamespaceDto[]> {
    return [...this.namespaces.keys()].sort(compareNames).map((name) => this.toDto(name));
  }

  async createNamespace(name: string, description?: string): Promise<NamespaceDto> {
    if (this.namespaces.has(name)) {
      throw new ApiError('DUPLICATE_NAMESPACE', `Namespace "${name}" already exists.`, [], 409);
    }
    this.assertDescription(description);
    const timestamp = this.now();
    this.namespaces.set(name, {
      description: normalize(description),
      created_at: timestamp,
      modified_at: timestamp,
      entries: new Map(),
    });
    return this.toDto(name);
  }

  async getNamespace(name: string): Promise<NamespaceDto> {
    this.assertNamespace(name);
    return this.toDto(name);
  }

  async updateNamespace(name: string, changes: NamespaceChangesInput): Promise<NamespaceDto> {
    const namespace = this.assertNamespace(name);
    if (changes.name === undefined && changes.description === undefined) {
      throw new ApiError(
        'VALIDATION_ERROR',
        'Update must change a name or a description.',
        [],
        400,
      );
    }
    this.assertDescription(changes.description);
    const newName = changes.name ?? name;
    if (newName !== name && this.namespaces.has(newName)) {
      throw new ApiError('DUPLICATE_NAMESPACE', `Namespace "${newName}" already exists.`, [], 409);
    }
    this.namespaces.delete(name);
    this.namespaces.set(newName, {
      ...namespace,
      description:
        changes.description === undefined ? namespace.description : normalize(changes.description),
      modified_at: this.now(),
    });
    return this.toDto(newName);
  }

  async deleteNamespace(name: string): Promise<void> {
    this.assertNamespace(name);
    this.namespaces.delete(name);
  }

  async listEntries(namespace: string): Promise<EntryDto[]> {
    this.assertNamespace(namespace);
    return this.toDto(namespace).entries;
  }

  async createEntry(
    namespace: string,
    name: string,
    value: string,
    description?: string,
    envDependent?: boolean,
  ): Promise<EntryDto> {
    const ns = this.assertNamespace(namespace);
    if (ns.entries.has(name)) {
      throw new ApiError('DUPLICATE_ENTRY', `Entry "${name}" already exists.`, [], 409);
    }
    this.assertDescription(description);
    const timestamp = this.now();
    ns.entries.set(name, {
      value,
      description: normalize(description),
      env_dependent: envDependent ?? false,
      created_at: timestamp,
      modified_at: timestamp,
    });
    ns.modified_at = timestamp;
    return this.toDto(namespace).entries.find((entry) => entry.name === name)!;
  }

  async updateEntry(
    namespace: string,
    name: string,
    changes: EntryChangesInput,
  ): Promise<EntryDto> {
    const ns = this.assertNamespace(namespace);
    const existing = ns.entries.get(name);
    if (!existing) {
      throw new ApiError('ENTRY_NOT_FOUND', `Entry "${name}" was not found.`, [], 404);
    }
    this.assertDescription(changes.description);
    const nextName = changes.name ?? name;
    const nextValue = changes.value ?? existing.value;
    const timestamp = this.now();
    ns.entries.delete(name);
    ns.entries.set(nextName, {
      value: nextValue,
      description:
        changes.description === undefined ? existing.description : normalize(changes.description),
      env_dependent: changes.env_dependent ?? existing.env_dependent,
      created_at: existing.created_at,
      modified_at: timestamp,
    });
    ns.modified_at = timestamp;
    return this.toDto(namespace).entries.find((entry) => entry.name === nextName)!;
  }

  async deleteEntry(namespace: string, name: string): Promise<void> {
    const ns = this.assertNamespace(namespace);
    if (ns.entries.delete(name)) {
      ns.modified_at = this.now();
    }
  }

  async importYaml(yaml: string): Promise<NamespaceDto[]> {
    if (!yaml.includes('namespace')) {
      throw new ApiError('INVALID_YAML', 'YAML content is not valid.', [], 400);
    }
    return this.listNamespaces();
  }

  async importYamlFile(file: File): Promise<NamespaceDto[]> {
    return this.importYaml(await readFileText(file));
  }

  async exportAll(): Promise<string> {
    const names = [...this.namespaces.keys()].sort(compareNames).join(', ');
    return `namespaces: ${names}`;
  }

  async exportNamespace(name: string): Promise<string> {
    this.assertNamespace(name);
    return `namespaces: ${name}`;
  }

  /** Mirrors the API's boundary rejection of oversized descriptions. */
  private assertDescription(description: string | undefined): void {
    if (description !== undefined && description.length > DESCRIPTION_MAX_LENGTH) {
      throw new ApiError(
        'VALIDATION_ERROR',
        'Validation failed.',
        [`description must be shorter than or equal to ${DESCRIPTION_MAX_LENGTH} characters`],
        400,
      );
    }
  }

  private assertNamespace(name: string): FakeNamespace {
    const namespace = this.namespaces.get(name);
    if (!namespace) {
      throw new ApiError('NAMESPACE_NOT_FOUND', `Namespace "${name}" was not found.`, [], 404);
    }
    return namespace;
  }
}

// jsdom does not implement File.text(); read via FileReader instead.
function readFileText(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result));
    reader.onerror = () => reject(reader.error);
    reader.readAsText(file);
  });
}
