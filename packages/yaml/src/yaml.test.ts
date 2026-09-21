import { describe, expect, it } from 'vitest';
import { YamlError, parseNamespacesYaml, serializeNamespacesYaml } from './index.js';

function failure(text: string): YamlError {
  try {
    parseNamespacesYaml(text);
  } catch (error) {
    expect(error).toBeInstanceOf(YamlError);
    return error as YamlError;
  }
  throw new Error('expected the YAML to be rejected');
}

const single = (body: string) => `namespaces:\n  - name: ns\n    entries:\n${body}`;

describe('parseNamespacesYaml — accepted documents', () => {
  it('GIVEN the canonical plural shape WHEN parsed THEN namespaces and entries are returned', () => {
    const parsed = parseNamespacesYaml(`namespaces:
  - name: users
    description: Accounts for the admin console.
    entries:
      - name: admin
        value: secret
        description: API key used by the admin console.
        env_dependent: false
      - name: db-host
        value: db.prod.internal
        env_dependent: true
  - name: settings
    entries: []
`);

    expect(parsed).toEqual([
      {
        name: 'users',
        description: 'Accounts for the admin console.',
        entries: [
          {
            name: 'admin',
            value: 'secret',
            description: 'API key used by the admin console.',
            envDependent: false,
          },
          { name: 'db-host', value: 'db.prod.internal', envDependent: true },
        ],
      },
      { name: 'settings', entries: [] },
    ]);
  });

  it('GIVEN the single namespace shape WHEN parsed THEN it yields one namespace', () => {
    const parsed = parseNamespacesYaml(`namespace:
  name: solo
  entries:
    - name: k
      value: v
`);

    expect(parsed).toEqual([
      { name: 'solo', entries: [{ name: 'k', value: 'v', envDependent: false }] },
    ]);
  });

  it('GIVEN a missing env_dependent WHEN parsed THEN it defaults to false', () => {
    expect(
      parseNamespacesYaml(single('      - name: k\n        value: v\n'))[0]?.entries[0],
    ).toEqual({ name: 'k', value: 'v', envDependent: false });
  });

  it('GIVEN padded names and descriptions WHEN parsed THEN they are trimmed and blanks dropped', () => {
    const parsed = parseNamespacesYaml(`namespaces:
  - name: "  padded  "
    description: "   "
    entries:
      - name: " k "
        value: v
        description: "  note  "
      - name: j
        value: v
        description: ""
`);

    expect(parsed[0]).toEqual({
      name: 'padded',
      entries: [
        { name: 'k', value: 'v', description: 'note', envDependent: false },
        { name: 'j', value: 'v', envDependent: false },
      ],
    });
  });

  it('GIVEN created_at and modified_at metadata WHEN parsed THEN it is accepted and ignored', () => {
    const parsed = parseNamespacesYaml(`namespaces:
  - name: ns
    created_at: 2026-01-01T00:00:00.000Z
    modified_at: anything
    entries:
      - name: k
        value: v
        created_at: 2026-01-01T00:00:00.000Z
        modified_at: 2026-01-02T00:00:00.000Z
`);

    expect(parsed).toEqual([
      { name: 'ns', entries: [{ name: 'k', value: 'v', envDependent: false }] },
    ]);
  });

  it('GIVEN values of exactly the maximum lengths WHEN parsed THEN they are accepted', () => {
    const parsed = parseNamespacesYaml(
      `namespaces:\n  - name: ${'n'.repeat(128)}\n    description: ${'d'.repeat(1000)}\n    entries:\n      - name: k\n        value: ${'v'.repeat(65_536)}\n`,
    );

    expect(parsed[0]?.name).toHaveLength(128);
    expect(parsed[0]?.description).toHaveLength(1000);
    expect(parsed[0]?.entries[0]?.value).toHaveLength(65_536);
  });

  it('GIVEN a multi-line block value WHEN parsed THEN newlines are preserved', () => {
    const parsed = parseNamespacesYaml(
      single('      - name: k\n        value: |\n          a\n          b\n'),
    );

    expect(parsed[0]?.entries[0]?.value).toBe('a\nb\n');
  });
});

describe('parseNamespacesYaml — rejected documents', () => {
  it.each(['', '   \n  '])('GIVEN empty content %j WHEN parsed THEN INVALID_YAML', (text) => {
    const error = failure(text);

    expect(error.code).toBe('INVALID_YAML');
    expect(error.message).toBe('YAML content must not be empty.');
  });

  it('GIVEN content over 1 MiB WHEN parsed THEN it is rejected before parsing', () => {
    const error = failure(`namespaces: []\n# ${'x'.repeat(1_048_577)}`);

    expect(error.code).toBe('INVALID_YAML');
    expect(error.message).toContain('at most 1048576 bytes');
  });

  it('GIVEN multi-byte content over 1 MiB in bytes WHEN parsed THEN the byte size is enforced', () => {
    const error = failure(`# ${'日'.repeat(400_000)}\nnamespaces: []`);

    expect(error.message).toContain('at most 1048576 bytes');
  });

  it('GIVEN broken YAML syntax WHEN parsed THEN the parser messages are the details', () => {
    const error = failure('namespaces: [unterminated');

    expect(error.code).toBe('INVALID_YAML');
    expect(error.message).toBe('YAML content is not valid YAML.');
    expect(error.details.length).toBeGreaterThan(0);
  });

  it('GIVEN duplicate mapping keys WHEN parsed THEN it is rejected', () => {
    expect(failure('namespaces: []\nnamespaces: []').code).toBe('INVALID_YAML');
  });

  it('GIVEN several YAML documents WHEN parsed THEN it is rejected', () => {
    expect(failure('namespaces: []\n---\nnamespaces: []').code).toBe('INVALID_YAML');
  });

  it('GIVEN aliases WHEN parsed THEN they are rejected', () => {
    const error = failure(`namespaces:
  - name: a
    entries:
      - &e {name: k, value: v}
      - *e
`);

    expect(error.message).toBe('YAML aliases are not supported.');
  });

  it.each([
    ['a list root', '- a\n- b'],
    ['a scalar root', 'hello'],
    ['a null root', '# only a comment\n'],
  ])('GIVEN %s WHEN parsed THEN the shape is rejected', (_label, text) => {
    expect(failure(text).message).toContain('must be a mapping');
  });

  it('GIVEN an unexpected root key WHEN parsed THEN it is rejected', () => {
    expect(failure('namespaces: []\nextra: 1').message).toBe(
      'Unexpected key "extra" in the document root.',
    );
  });

  it('GIVEN both root shapes WHEN parsed THEN it is rejected', () => {
    expect(failure('namespaces: []\nnamespace: {name: a, entries: []}').message).toBe(
      'Use either "namespaces" or "namespace", not both.',
    );
  });

  it('GIVEN neither root shape WHEN parsed THEN it is rejected', () => {
    expect(failure('{}').message).toContain('must contain a "namespaces" list');
  });

  it('GIVEN namespaces that is not a list WHEN parsed THEN it is rejected', () => {
    expect(failure('namespaces: nope').message).toBe('"namespaces" must be a list.');
  });

  it('GIVEN a namespace that is not a mapping WHEN parsed THEN it is rejected', () => {
    expect(failure('namespaces:\n  - just-a-string').message).toContain(
      'namespaces[0]: a namespace must be a mapping.',
    );
    expect(failure('namespace: 5').message).toContain('namespace: a namespace must be a mapping.');
  });

  it('GIVEN an unexpected namespace key WHEN parsed THEN it is rejected', () => {
    expect(failure('namespaces:\n  - name: a\n    entries: []\n    owner: me').message).toBe(
      'Unexpected key "owner" in namespaces[0].',
    );
  });

  it.each([
    ['a missing name', 'namespaces:\n  - entries: []', 'name must be a string'],
    ['a numeric name', 'namespaces:\n  - name: 12\n    entries: []', 'name must be a string'],
    ['an empty name', 'namespaces:\n  - name: ""\n    entries: []', 'name must be 1 to 128'],
    [
      'an oversized name',
      `namespaces:\n  - name: ${'a'.repeat(129)}\n    entries: []`,
      'name must be 1 to 128',
    ],
    [
      'a disallowed name',
      'namespaces:\n  - name: "-bad"\n    entries: []',
      'must start with a letter',
    ],
  ])('GIVEN %s WHEN parsed THEN INVALID_YAML', (_label, text, fragment) => {
    const error = failure(text);

    expect(error.code).toBe('INVALID_YAML');
    expect(error.message).toContain(fragment);
  });

  it.each([
    ['missing entries', 'namespaces:\n  - name: a'],
    ['non-list entries', 'namespaces:\n  - name: a\n    entries: nope'],
  ])('GIVEN %s WHEN parsed THEN it is rejected', (_label, text) => {
    expect(failure(text).message).toBe('namespaces[0]: entries must be a list.');
  });

  it.each([
    [
      'a non-string namespace description',
      'namespaces:\n  - name: a\n    description: 5\n    entries: []',
    ],
    [
      'an oversized namespace description',
      `namespaces:\n  - name: a\n    description: ${'d'.repeat(1001)}\n    entries: []`,
    ],
  ])('GIVEN %s WHEN parsed THEN it is rejected', (_label, text) => {
    expect(failure(text).message).toContain('description must');
  });

  it('GIVEN an entry that is not a mapping WHEN parsed THEN it is rejected', () => {
    expect(failure(single('      - plain')).message).toBe(
      'namespaces[0].entries[0]: an entry must be a mapping.',
    );
  });

  it('GIVEN an unexpected entry key WHEN parsed THEN it is rejected', () => {
    expect(failure(single('      - name: k\n        value: v\n        extra: 1')).message).toBe(
      'Unexpected key "extra" in namespaces[0].entries[0].',
    );
  });

  it.each([
    ['a missing value', '      - name: k'],
    ['a null value', '      - name: k\n        value:'],
    ['a numeric value', '      - name: k\n        value: 123'],
    ['a boolean value', '      - name: k\n        value: true'],
  ])('GIVEN %s WHEN parsed THEN the value must be a string', (_label, body) => {
    expect(failure(single(body)).message).toContain('value must be a string.');
  });

  it('GIVEN an oversized value WHEN parsed THEN it is rejected', () => {
    expect(
      failure(single(`      - name: k\n        value: ${'v'.repeat(65_537)}`)).message,
    ).toContain('value must be at most 65536 characters.');
  });

  it.each(['"true"', '1', 'null', '[]'])(
    'GIVEN env_dependent %s WHEN parsed THEN it must be a boolean',
    (value) => {
      const error = failure(
        single(`      - name: k\n        value: v\n        env_dependent: ${value}`),
      );

      expect(error.code).toBe('INVALID_YAML');
      expect(error.message).toContain('env_dependent must be a boolean.');
    },
  );

  it('GIVEN an entry with a bad name WHEN parsed THEN the location is reported', () => {
    expect(failure(single('      - name: "!"\n        value: v')).message).toContain(
      'namespaces[0].entries[0]: name "!" must start with a letter',
    );
  });

  it.each([
    ['non-string', '5'],
    ['oversized', 'd'.repeat(1001)],
  ])('GIVEN a %s entry description WHEN parsed THEN it is rejected', (_label, description) => {
    expect(
      failure(single(`      - name: k\n        value: v\n        description: ${description}`))
        .message,
    ).toContain('description must');
  });

  it('GIVEN duplicate namespaces after normalization WHEN parsed THEN DUPLICATE_NAMESPACE', () => {
    const error = failure(`namespaces:
  - name: a
    entries: []
  - name: " a "
    entries: []
`);

    expect(error.code).toBe('DUPLICATE_NAMESPACE');
    expect(error.message).toBe('Duplicate namespace "a".');
  });

  it('GIVEN duplicate entries after normalization WHEN parsed THEN DUPLICATE_ENTRY', () => {
    const error = failure(
      single('      - name: k\n        value: "1"\n      - name: " k "\n        value: "2"'),
    );

    expect(error.code).toBe('DUPLICATE_ENTRY');
    expect(error.message).toBe('namespaces[0]: duplicate entry "k".');
  });

  it('GIVEN one invalid namespace among valid ones WHEN parsed THEN nothing is returned', () => {
    expect(() =>
      parseNamespacesYaml(`namespaces:
  - name: good
    entries: []
  - name: "!"
    entries: []
`),
    ).toThrow(YamlError);
  });
});

describe('YamlError', () => {
  it('GIVEN an error WHEN inspected THEN it has a name, code and default details', () => {
    const error = new YamlError('INVALID_YAML', 'bad');

    expect(error).toBeInstanceOf(Error);
    expect(error.name).toBe('YamlError');
    expect(error.details).toEqual([]);
  });
});

describe('serializeNamespacesYaml', () => {
  const created = new Date('2026-09-21T10:00:00.000Z');
  const modified = new Date('2026-09-22T11:30:00.000Z');

  it('GIVEN namespaces WHEN serialized THEN raw canonical YAML is emitted in name order', () => {
    const yaml = serializeNamespacesYaml([
      {
        name: 'b',
        entries: [
          { name: 'z', value: 'last', envDependent: false },
          { name: 'a', value: 'first', envDependent: true },
        ],
      },
      { name: 'a', entries: [] },
    ]);

    expect(yaml).toBe(`namespaces:
  - name: a
    entries: []
  - name: b
    entries:
      - name: a
        value: first
        env_dependent: true
      - name: z
        value: last
        env_dependent: false
`);
    expect(yaml).not.toContain('```');
  });

  it('GIVEN descriptions and timestamps WHEN serialized THEN they are emitted only when present', () => {
    const yaml = serializeNamespacesYaml([
      {
        name: 'ns',
        description: 'about ns',
        createdAt: created,
        modifiedAt: modified,
        entries: [
          {
            name: 'k',
            value: 'v',
            description: 'about k',
            envDependent: false,
            createdAt: created,
            modifiedAt: modified,
          },
          { name: 'plain', value: 'v', envDependent: false, createdAt: created },
          { name: 'other', value: 'v', envDependent: false, modifiedAt: modified },
        ],
      },
    ]);

    expect(yaml).toContain('description: about ns');
    expect(yaml).toContain('created_at: 2026-09-21T10:00:00.000Z');
    expect(yaml).toContain('modified_at: 2026-09-22T11:30:00.000Z');
    expect(yaml).toContain('description: about k');
    expect(yaml.match(/created_at/g)).toHaveLength(3);
    expect(yaml.match(/modified_at/g)).toHaveLength(3);
  });

  it('GIVEN no namespaces WHEN serialized THEN an empty list is emitted', () => {
    expect(serializeNamespacesYaml([])).toBe('namespaces: []\n');
  });

  it('GIVEN awkward values WHEN serialized and parsed THEN they round-trip exactly', () => {
    const values = [
      '123',
      'true',
      'null',
      ' padded ',
      'multi\nline\n',
      'colon: value',
      '#hash',
      '',
    ];
    const yaml = serializeNamespacesYaml([
      {
        name: 'ns',
        description: 'd',
        createdAt: created,
        modifiedAt: modified,
        entries: values.map((value, index) => ({
          name: `k${index}`,
          value,
          envDependent: index % 2 === 0,
          createdAt: created,
          modifiedAt: modified,
        })),
      },
    ]);
    const parsed = parseNamespacesYaml(yaml);

    expect(parsed[0]?.entries.map((entry) => entry.value)).toEqual(values);
    expect(parsed[0]?.entries.map((entry) => entry.envDependent)).toEqual(
      values.map((_value, index) => index % 2 === 0),
    );
  });
});
