import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

const read = (relative: string) =>
  readFileSync(new URL(relative, import.meta.url), 'utf8').replace(/\r\n/g, '\n');

describe('docs/design-tokens.css', () => {
  it('GIVEN the vendored token sheet WHEN compared with styles.css THEN it is a verbatim extract', () => {
    const doc = read('../../../docs/design-tokens.css');
    const extract = doc.slice(doc.indexOf('*/') + 2).trim();

    expect(read('./styles.css')).toContain(extract);
  });
});
