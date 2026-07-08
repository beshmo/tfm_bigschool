import { describe, expect, it } from 'vitest';
import { ERROR_CODES } from '@okvns/shared';
import { MarkdownError, parseNamespacesMarkdown, serializeNamespacesMarkdown } from './index.js';

const fence = (yaml: string) => '```yaml\n' + yaml + '\n```';

describe('parseNamespacesMarkdown', () => {
  it('GIVEN a namespaces array WHEN parsed THEN it returns all namespaces and entries', () => {
    const md = `namespaces:
  - name: users
    entries:
      - name: admin
        value: secret
      - name: guest
        value: ""
  - name: settings
    entries: []`;
    const result = parseNamespacesMarkdown(md);
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
    const md = `namespace:
  name: users
  entries:
    - name: admin
      value: secret`;
    expect(parseNamespacesMarkdown(md)).toEqual([
      { name: 'users', entries: [{ name: 'admin', value: 'secret' }] },
    ]);
  });

  it('GIVEN content wrapped in a yaml code fence WHEN parsed THEN the fence is stripped', () => {
    const md = fence('namespaces:\n  - name: users\n    entries: []');
    expect(parseNamespacesMarkdown(md)).toEqual([{ name: 'users', entries: [] }]);
  });

  it('GIVEN a namespace without an entries key WHEN parsed THEN entries default to empty', () => {
    expect(parseNamespacesMarkdown('namespace:\n  name: users')).toEqual([
      { name: 'users', entries: [] },
    ]);
  });

  it('GIVEN names needing trimming WHEN parsed THEN they are normalized', () => {
    const md = `namespace:
  name: "  users  "
  entries:
    - name: "  admin  "
      value: v`;
    expect(parseNamespacesMarkdown(md)).toEqual([
      { name: 'users', entries: [{ name: 'admin', value: 'v' }] },
    ]);
  });

  const expectCode = (fn: () => unknown, code: string) => {
    try {
      fn();
      throw new Error('expected MarkdownError');
    } catch (error) {
      expect(error).toBeInstanceOf(MarkdownError);
      expect((error as MarkdownError).code).toBe(code);
    }
  };

  it('GIVEN an oversized payload WHEN parsed THEN it throws INVALID_MARKDOWN', () => {
    const big = 'namespace:\n  name: users\n  entries:\n    - name: k\n      value: ' + 'x'.repeat(1_100_000);
    expectCode(() => parseNamespacesMarkdown(big), ERROR_CODES.INVALID_MARKDOWN);
  });

  it('GIVEN malformed YAML WHEN parsed THEN it throws INVALID_MARKDOWN', () => {
    expectCode(() => parseNamespacesMarkdown('namespaces: [unterminated'), ERROR_CODES.INVALID_MARKDOWN);
  });

  it('GIVEN a non-object root WHEN parsed THEN it throws INVALID_MARKDOWN', () => {
    expectCode(() => parseNamespacesMarkdown('- just\n- a\n- list'), ERROR_CODES.INVALID_MARKDOWN);
    expectCode(() => parseNamespacesMarkdown('just a string'), ERROR_CODES.INVALID_MARKDOWN);
    expectCode(() => parseNamespacesMarkdown('null'), ERROR_CODES.INVALID_MARKDOWN);
    expectCode(() => parseNamespacesMarkdown(''), ERROR_CODES.INVALID_MARKDOWN);
  });

  it('GIVEN both namespace and namespaces keys WHEN parsed THEN it throws INVALID_MARKDOWN', () => {
    expectCode(
      () => parseNamespacesMarkdown('namespace:\n  name: a\nnamespaces:\n  - name: b'),
      ERROR_CODES.INVALID_MARKDOWN,
    );
  });

  it('GIVEN an unexpected root key WHEN parsed THEN it throws INVALID_MARKDOWN', () => {
    expectCode(() => parseNamespacesMarkdown('unexpected: true'), ERROR_CODES.INVALID_MARKDOWN);
    expectCode(
      () => parseNamespacesMarkdown('namespace:\n  name: a\nextra: true'),
      ERROR_CODES.INVALID_MARKDOWN,
    );
  });

  it('GIVEN a non-array namespaces value WHEN parsed THEN it throws INVALID_MARKDOWN', () => {
    expectCode(() => parseNamespacesMarkdown('namespaces: not-an-array'), ERROR_CODES.INVALID_MARKDOWN);
  });

  it('GIVEN a non-object namespace item WHEN parsed THEN it throws INVALID_MARKDOWN', () => {
    expectCode(() => parseNamespacesMarkdown('namespaces:\n  - just-a-string'), ERROR_CODES.INVALID_MARKDOWN);
    expectCode(() => parseNamespacesMarkdown('namespace: just-a-string'), ERROR_CODES.INVALID_MARKDOWN);
  });

  it('GIVEN an unexpected namespace key WHEN parsed THEN it throws INVALID_MARKDOWN', () => {
    expectCode(
      () => parseNamespacesMarkdown('namespace:\n  name: a\n  extra: nope'),
      ERROR_CODES.INVALID_MARKDOWN,
    );
  });

  it('GIVEN a missing or invalid namespace name WHEN parsed THEN it throws INVALID_MARKDOWN', () => {
    expectCode(() => parseNamespacesMarkdown('namespace:\n  entries: []'), ERROR_CODES.INVALID_MARKDOWN);
    expectCode(() => parseNamespacesMarkdown('namespace:\n  name: 42'), ERROR_CODES.INVALID_MARKDOWN);
    expectCode(() => parseNamespacesMarkdown('namespace:\n  name: "bad name"'), ERROR_CODES.INVALID_MARKDOWN);
  });

  it('GIVEN a non-array entries value WHEN parsed THEN it throws INVALID_MARKDOWN', () => {
    expectCode(
      () => parseNamespacesMarkdown('namespace:\n  name: a\n  entries: nope'),
      ERROR_CODES.INVALID_MARKDOWN,
    );
  });

  it('GIVEN a non-object entry WHEN parsed THEN it throws INVALID_MARKDOWN', () => {
    expectCode(
      () => parseNamespacesMarkdown('namespace:\n  name: a\n  entries:\n    - just-a-string'),
      ERROR_CODES.INVALID_MARKDOWN,
    );
  });

  it('GIVEN an unexpected entry key WHEN parsed THEN it throws INVALID_MARKDOWN', () => {
    expectCode(
      () => parseNamespacesMarkdown('namespace:\n  name: a\n  entries:\n    - name: k\n      value: v\n      extra: x'),
      ERROR_CODES.INVALID_MARKDOWN,
    );
  });

  it('GIVEN an invalid entry name WHEN parsed THEN it throws INVALID_MARKDOWN', () => {
    expectCode(
      () => parseNamespacesMarkdown('namespace:\n  name: a\n  entries:\n    - name: "bad name"\n      value: v'),
      ERROR_CODES.INVALID_MARKDOWN,
    );
  });

  it('GIVEN a missing or non-string entry value WHEN parsed THEN it throws INVALID_MARKDOWN', () => {
    expectCode(
      () => parseNamespacesMarkdown('namespace:\n  name: a\n  entries:\n    - name: k'),
      ERROR_CODES.INVALID_MARKDOWN,
    );
    expectCode(
      () => parseNamespacesMarkdown('namespace:\n  name: a\n  entries:\n    - name: k\n      value: 42'),
      ERROR_CODES.INVALID_MARKDOWN,
    );
  });

  it('GIVEN a duplicate namespace after normalization WHEN parsed THEN it throws DUPLICATE_NAMESPACE', () => {
    expectCode(
      () => parseNamespacesMarkdown('namespaces:\n  - name: users\n  - name: "  users  "'),
      ERROR_CODES.DUPLICATE_NAMESPACE,
    );
  });

  it('GIVEN a duplicate entry after normalization WHEN parsed THEN it throws DUPLICATE_ENTRY', () => {
    expectCode(
      () =>
        parseNamespacesMarkdown(
          'namespace:\n  name: a\n  entries:\n    - name: k\n      value: "1"\n    - name: "  k  "\n      value: "2"',
        ),
      ERROR_CODES.DUPLICATE_ENTRY,
    );
  });
});

describe('serializeNamespacesMarkdown', () => {
  it('GIVEN namespaces WHEN serialized THEN it emits a canonical fenced yaml block sorted by name', () => {
    const md = serializeNamespacesMarkdown([
      { name: 'zeta', entries: [{ name: 'b', value: '2' }, { name: 'a', value: '1' }] },
      { name: 'alpha', entries: [] },
    ]);
    expect(md.startsWith('```yaml\n')).toBe(true);
    expect(md.trimEnd().endsWith('```')).toBe(true);
    const roundTrip = parseNamespacesMarkdown(md);
    expect(roundTrip).toEqual([
      { name: 'alpha', entries: [] },
      { name: 'zeta', entries: [{ name: 'a', value: '1' }, { name: 'b', value: '2' }] },
    ]);
  });

  it('GIVEN an empty namespace list WHEN serialized THEN it round-trips to an empty list', () => {
    const md = serializeNamespacesMarkdown([]);
    expect(parseNamespacesMarkdown(md)).toEqual([]);
  });

  it('GIVEN a MarkdownError WHEN constructed THEN it carries a code and details', () => {
    const error = new MarkdownError(ERROR_CODES.INVALID_MARKDOWN, 'bad', ['line 1']);
    expect(error.name).toBe('MarkdownError');
    expect(error.details).toEqual(['line 1']);
    expect(new MarkdownError(ERROR_CODES.INVALID_MARKDOWN, 'bad').details).toEqual([]);
  });
});
