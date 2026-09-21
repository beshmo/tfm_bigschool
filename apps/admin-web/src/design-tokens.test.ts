import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

const read = (relative: string) =>
  readFileSync(new URL(relative, import.meta.url), 'utf8').replace(/\r\n/g, '\n');

/** The vendored sheets start with a header comment; the extract is everything after it. */
const extractOf = (relative: string) => {
  const doc = read(relative);
  return doc.slice(doc.indexOf('*/') + 2).trim();
};

describe('docs/design-tokens.css', () => {
  it('GIVEN the vendored token sheet WHEN compared with styles.css THEN it is a verbatim extract', () => {
    expect(read('./styles.css')).toContain(extractOf('../../../docs/design-tokens.css'));
  });
});

describe('docs/design-components.css', () => {
  it('GIVEN the vendored component sheet WHEN compared with styles.css THEN it is a verbatim extract', () => {
    expect(read('./styles.css')).toContain(extractOf('../../../docs/design-components.css'));
  });

  it('GIVEN both vendored sheets WHEN concatenated THEN styles.css consists of its header comment followed by exactly that text', () => {
    const tokens = extractOf('../../../docs/design-tokens.css');
    const components = extractOf('../../../docs/design-components.css');

    const styles = read('./styles.css').trim();

    expect(styles.endsWith(`${tokens}\n\n${components}`)).toBe(true);
    expect(styles.slice(0, styles.indexOf('@import')).trim()).toMatch(/^\/\*[\s\S]*\*\/$/);
  });
});

describe('design system rules', () => {
  const styles = read('./styles.css');

  it('GIVEN the panel and card rules WHEN styles.css is read THEN blueprint frames are square with registration marks', () => {
    expect(styles).toMatch(/\.blueprint\s*{[^}]*border-radius:\s*0/);
    expect(styles).toMatch(/\.blueprint > \.corner\.tl/);
    expect(styles).toMatch(/\.blueprint > \.corner\.br/);
  });

  it('GIVEN the docs WHEN styles.css is read THEN there is no .card rule (framed panels are .panel.blueprint)', () => {
    expect(styles).not.toMatch(/\.card\b/);
  });
});
