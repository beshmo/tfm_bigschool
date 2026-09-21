/** The namespace the demo page reads all of its content from. */
export const DEMO_NAMESPACE = 'demo-consumer';

/**
 * Built-in defaults, one per entry. The wrapper returns the default whenever an
 * entry (or the whole namespace) does not exist, so the page always renders.
 * Importing docs/tfm/okvns-demo-use-cases.yaml populates the live values.
 */
export const DEMO_DEFAULTS = {
  header: 'OKVNS demo consumer',
  tagline: 'Content served by OKVNS, with built-in defaults as a safety net.',
  'use-case-mode': '0',
  'body-headline': 'Built-in defaults are showing',
  'body-content':
    'This paragraph is the application default. Create the demo-consumer namespace in OKVNS to replace it with live content.',
  'banner-enabled': 'false',
  'banner-message': '',
  'warning-enabled': 'false',
  'warning-title': '',
  'warning-description': '',
  'cta-label': 'Learn more',
  'support-endpoint': 'http://localhost:3000/docs',
  'footer-copyright': 'Copyright 2026 OKVNS demo.',
} as const;

export type DemoEntryKey = keyof typeof DEMO_DEFAULTS;
export type DemoContent = Record<DemoEntryKey, string>;

export const DEMO_ENTRY_KEYS = Object.keys(DEMO_DEFAULTS) as DemoEntryKey[];

export const DEMO_DISCLAIMER =
  'Demonstration only: this page is a sample consumer of OKVNS and has no authentication.';
