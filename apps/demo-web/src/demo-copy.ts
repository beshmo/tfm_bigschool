// Namespace and entry names the demo consumer reads live from OKVNS. These match
// the `demo-consumer` namespace in docs/tfm/okvns-demo-use-cases.yaml, so importing
// that file drives this page end to end.
export const DEMO_NAMESPACE = 'demo-consumer';

export const DEMO_ENTRIES = {
  header: 'header',
  tagline: 'tagline',
  useCaseMode: 'use-case-mode',
  bodyHeadline: 'body-headline',
  bodyContent: 'body-content',
  bannerEnabled: 'banner-enabled',
  bannerMessage: 'banner-message',
  warningEnabled: 'warning-enabled',
  warningTitle: 'warning-title',
  warningDescription: 'warning-description',
  ctaLabel: 'cta-label',
  supportEndpoint: 'support-endpoint',
  footerCopyright: 'footer-copyright',
} as const;

// Built-in defaults used when the OKVNS entry is missing, so the page still renders
// (and demonstrates the wrapper's default-value fallback) before the namespace is imported.
export const DEFAULTS = {
  header: 'OKVNS demo consumer',
  tagline: 'Content served from centralized key-value configuration.',
  useCaseMode: '0',
  bodyHeadline: 'Runtime configuration, no redeploy',
  bodyContent:
    'Lorem ipsum dolor sit amet, consectetur adipiscing elit. Integer posuere erat a ante venenatis dapibus posuere velit aliquet.',
  bannerEnabled: 'false',
  bannerMessage: '',
  warningEnabled: 'false',
  warningTitle: '',
  warningDescription: '',
  ctaLabel: 'Learn more',
  supportEndpoint: 'http://okvns.beshmo.es/api/docs',
  footerCopyright: 'Copyright 2026 OKVNS demo.',
} as const;
