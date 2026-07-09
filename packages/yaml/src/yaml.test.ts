import { describe, expect, it } from 'vitest';
import { ERROR_CODES } from '@okvns/shared';
import { YamlError, parseNamespacesYaml, serializeNamespacesYaml } from './index.js';

describe('parseNamespacesYaml', () => {
  it('GIVEN a namespaces array WHEN parsed THEN it returns all namespaces and entries', () => {
    const yaml = `namespaces:
  - name: users
    entries:
      - name: admin
        value: secret
      - name: guest
        value: ""
  - name: settings
    entries: []`;
    const result = parseNamespacesYaml(yaml);
    expect(result).toEqual([
      {
        name: 'users',
        entries: [
          { name: 'admin', value: 'secret' },
          { name: 'guest', value: '' },
        ],
      },
      { name: 'settings', entries: [] },
    ]);
  });

  it('GIVEN a single namespace shape WHEN parsed THEN it returns one namespace', () => {
    const yaml = `namespace:
  name: users
  entries:
    - name: admin
      value: secret`;
    expect(parseNamespacesYaml(yaml)).toEqual([
      { name: 'users', entries: [{ name: 'admin', value: 'secret' }] },
    ]);
  });

  it('GIVEN a namespace without an entries key WHEN parsed THEN entries default to empty', () => {
    expect(parseNamespacesYaml('namespace:\n  name: users')).toEqual([
      { name: 'users', entries: [] },
    ]);
  });

  it('GIVEN names needing trimming WHEN parsed THEN they are normalized', () => {
    const yaml = `namespace:
  name: "  users  "
  entries:
    - name: "  admin  "
      value: v`;
    expect(parseNamespacesYaml(yaml)).toEqual([
      { name: 'users', entries: [{ name: 'admin', value: 'v' }] },
    ]);
  });

  const expectCode = (fn: () => unknown, code: string) => {
    try {
      fn();
      throw new Error('expected YamlError');
    } catch (error) {
      expect(error).toBeInstanceOf(YamlError);
      expect((error as YamlError).code).toBe(code);
    }
  };

  it('GIVEN an oversized payload WHEN parsed THEN it throws INVALID_YAML', () => {
    const big =
      'namespace:\n  name: users\n  entries:\n    - name: k\n      value: ' + 'x'.repeat(1_100_000);
    expectCode(() => parseNamespacesYaml(big), ERROR_CODES.INVALID_YAML);
  });

  it('GIVEN malformed YAML WHEN parsed THEN it throws INVALID_YAML', () => {
    expectCode(() => parseNamespacesYaml('namespaces: [unterminated'), ERROR_CODES.INVALID_YAML);
  });

  it('GIVEN a non-object root WHEN parsed THEN it throws INVALID_YAML', () => {
    expectCode(() => parseNamespacesYaml('- just\n- a\n- list'), ERROR_CODES.INVALID_YAML);
    expectCode(() => parseNamespacesYaml('just a string'), ERROR_CODES.INVALID_YAML);
    expectCode(() => parseNamespacesYaml('null'), ERROR_CODES.INVALID_YAML);
    expectCode(() => parseNamespacesYaml(''), ERROR_CODES.INVALID_YAML);
  });

  it('GIVEN both namespace and namespaces keys WHEN parsed THEN it throws INVALID_YAML', () => {
    expectCode(
      () => parseNamespacesYaml('namespace:\n  name: a\nnamespaces:\n  - name: b'),
      ERROR_CODES.INVALID_YAML,
    );
  });

  it('GIVEN an unexpected root key WHEN parsed THEN it throws INVALID_YAML', () => {
    expectCode(() => parseNamespacesYaml('unexpected: true'), ERROR_CODES.INVALID_YAML);
    expectCode(
      () => parseNamespacesYaml('namespace:\n  name: a\nextra: true'),
      ERROR_CODES.INVALID_YAML,
    );
  });

  it('GIVEN a non-array namespaces value WHEN parsed THEN it throws INVALID_YAML', () => {
    expectCode(() => parseNamespacesYaml('namespaces: not-an-array'), ERROR_CODES.INVALID_YAML);
  });

  it('GIVEN a non-object namespace item WHEN parsed THEN it throws INVALID_YAML', () => {
    expectCode(
      () => parseNamespacesYaml('namespaces:\n  - just-a-string'),
      ERROR_CODES.INVALID_YAML,
    );
    expectCode(() => parseNamespacesYaml('namespace: just-a-string'), ERROR_CODES.INVALID_YAML);
  });

  it('GIVEN an unexpected namespace key WHEN parsed THEN it throws INVALID_YAML', () => {
    expectCode(
      () => parseNamespacesYaml('namespace:\n  name: a\n  extra: nope'),
      ERROR_CODES.INVALID_YAML,
    );
  });

  it('GIVEN a missing or invalid namespace name WHEN parsed THEN it throws INVALID_YAML', () => {
    expectCode(() => parseNamespacesYaml('namespace:\n  entries: []'), ERROR_CODES.INVALID_YAML);
    expectCode(() => parseNamespacesYaml('namespace:\n  name: 42'), ERROR_CODES.INVALID_YAML);
    expectCode(
      () => parseNamespacesYaml('namespace:\n  name: "bad name"'),
      ERROR_CODES.INVALID_YAML,
    );
  });

  it('GIVEN a non-array entries value WHEN parsed THEN it throws INVALID_YAML', () => {
    expectCode(
      () => parseNamespacesYaml('namespace:\n  name: a\n  entries: nope'),
      ERROR_CODES.INVALID_YAML,
    );
  });

  it('GIVEN a non-object entry WHEN parsed THEN it throws INVALID_YAML', () => {
    expectCode(
      () => parseNamespacesYaml('namespace:\n  name: a\n  entries:\n    - just-a-string'),
      ERROR_CODES.INVALID_YAML,
    );
  });

  it('GIVEN an unexpected entry key WHEN parsed THEN it throws INVALID_YAML', () => {
    expectCode(
      () =>
        parseNamespacesYaml(
          'namespace:\n  name: a\n  entries:\n    - name: k\n      value: v\n      extra: x',
        ),
      ERROR_CODES.INVALID_YAML,
    );
  });

  it('GIVEN an invalid entry name WHEN parsed THEN it throws INVALID_YAML', () => {
    expectCode(
      () =>
        parseNamespacesYaml(
          'namespace:\n  name: a\n  entries:\n    - name: "bad name"\n      value: v',
        ),
      ERROR_CODES.INVALID_YAML,
    );
  });

  it('GIVEN a missing or non-string entry value WHEN parsed THEN it throws INVALID_YAML', () => {
    expectCode(
      () => parseNamespacesYaml('namespace:\n  name: a\n  entries:\n    - name: k'),
      ERROR_CODES.INVALID_YAML,
    );
    expectCode(
      () =>
        parseNamespacesYaml('namespace:\n  name: a\n  entries:\n    - name: k\n      value: 42'),
      ERROR_CODES.INVALID_YAML,
    );
  });

  it('GIVEN a duplicate namespace after normalization WHEN parsed THEN it throws DUPLICATE_NAMESPACE', () => {
    expectCode(
      () => parseNamespacesYaml('namespaces:\n  - name: users\n  - name: "  users  "'),
      ERROR_CODES.DUPLICATE_NAMESPACE,
    );
  });

  it('GIVEN a duplicate entry after normalization WHEN parsed THEN it throws DUPLICATE_ENTRY', () => {
    expectCode(
      () =>
        parseNamespacesYaml(
          'namespace:\n  name: a\n  entries:\n    - name: k\n      value: "1"\n    - name: "  k  "\n      value: "2"',
        ),
      ERROR_CODES.DUPLICATE_ENTRY,
    );
  });
});

describe('serializeNamespacesYaml', () => {
  it('GIVEN namespaces WHEN serialized THEN it emits raw canonical YAML sorted by name with no code fence', () => {
    const yaml = serializeNamespacesYaml([
      {
        name: 'zeta',
        entries: [
          { name: 'b', value: '2' },
          { name: 'a', value: '1' },
        ],
      },
      { name: 'alpha', entries: [] },
    ]);
    expect(yaml).not.toContain('```');
    expect(yaml.startsWith('namespaces:')).toBe(true);
    const roundTrip = parseNamespacesYaml(yaml);
    expect(roundTrip).toEqual([
      { name: 'alpha', entries: [] },
      {
        name: 'zeta',
        entries: [
          { name: 'a', value: '1' },
          { name: 'b', value: '2' },
        ],
      },
    ]);
  });

  it('GIVEN an empty namespace list WHEN serialized THEN it round-trips to an empty list', () => {
    const yaml = serializeNamespacesYaml([]);
    expect(parseNamespacesYaml(yaml)).toEqual([]);
  });

  it('GIVEN a YamlError WHEN constructed THEN it carries a code and details', () => {
    const error = new YamlError(ERROR_CODES.INVALID_YAML, 'bad', ['line 1']);
    expect(error.name).toBe('YamlError');
    expect(error.details).toEqual(['line 1']);
    expect(new YamlError(ERROR_CODES.INVALID_YAML, 'bad').details).toEqual([]);
  });
});
