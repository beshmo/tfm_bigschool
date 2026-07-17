import { render, screen } from '@testing-library/react';
import { OkvnsWrapper, type FetchLike, type FetchLikeResponse } from '@okvns/wrapper';
import { App } from './App';
import { DEFAULTS } from './demo-copy';

function renderDemo(entries: Record<string, string>) {
  const fetchImpl: FetchLike = async (input) => {
    const url = new URL(input);
    const entry = decodeURIComponent(url.pathname.split('/').at(-1) ?? '');
    if (entry in entries) {
      return jsonResponse(200, { value: entries[entry] });
    }
    return jsonResponse(404, {});
  };

  render(<App okvns={new OkvnsWrapper({ baseUrl: 'http://okvns.test', fetch: fetchImpl })} />);
}

function jsonResponse(status: number, body: unknown): FetchLikeResponse {
  return {
    ok: status >= 200 && status < 300,
    status,
    async json() {
      return body;
    },
  };
}

describe('App', () => {
  it('GIVEN no demo-consumer entries WHEN the page loads THEN defaults are shown', async () => {
    renderDemo({});

    expect(await screen.findByRole('heading', { name: DEFAULTS.header })).toBeInTheDocument();
    expect(screen.getByText(DEFAULTS.bodyContent)).toBeInTheDocument();
    expect(screen.getByText(DEFAULTS.footerCopyright)).toBeInTheDocument();
  });

  it('GIVEN demo-consumer content entries WHEN the page loads THEN their values are rendered', async () => {
    renderDemo({
      header: 'OKVNS live configuration demo',
      tagline: 'Served from centralized configuration.',
      'body-headline': 'Change this page without a deployment',
      'body-content': 'Read at runtime from OKVNS.',
      'footer-copyright': 'Copyright 2026 Example Corp.',
    });

    expect(
      await screen.findByRole('heading', { name: 'OKVNS live configuration demo' }),
    ).toBeInTheDocument();
    expect(screen.getByText('Served from centralized configuration.')).toBeInTheDocument();
    expect(
      screen.getByRole('heading', { name: 'Change this page without a deployment' }),
    ).toBeInTheDocument();
    expect(screen.getByText('Read at runtime from OKVNS.')).toBeInTheDocument();
    expect(screen.getByText('Copyright 2026 Example Corp.')).toBeInTheDocument();
  });

  it('GIVEN use-case-mode WHEN the page loads THEN the use case tag reflects it', async () => {
    renderDemo({ 'use-case-mode': '2' });

    expect(await screen.findByText('Use case #2')).toBeInTheDocument();
  });

  it('GIVEN the banner is enabled with a message WHEN the page loads THEN the banner is shown', async () => {
    renderDemo({ 'banner-enabled': 'true', 'banner-message': 'Live demo banner' });

    expect(await screen.findByText('Live demo banner')).toBeInTheDocument();
  });

  it('GIVEN the banner is disabled WHEN the page loads THEN no banner message is shown', async () => {
    renderDemo({ 'banner-enabled': 'false', 'banner-message': 'Hidden banner' });

    await screen.findByRole('heading', { name: DEFAULTS.header });
    expect(screen.queryByText('Hidden banner')).not.toBeInTheDocument();
  });

  it('GIVEN no warning entries WHEN the page loads THEN the warning panel is hidden', async () => {
    renderDemo({});

    await screen.findByRole('heading', { name: DEFAULTS.header });
    expect(screen.queryByRole('alert')).not.toBeInTheDocument();
  });

  it('GIVEN warning-enabled with a title and description WHEN the page loads THEN the warning panel is shown', async () => {
    renderDemo({
      'warning-enabled': 'true',
      'warning-title': 'Demo environment — no authentication',
      'warning-description': 'Do not store sensitive values.',
    });

    const panel = await screen.findByRole('alert');
    expect(panel).toHaveTextContent('Demo environment — no authentication');
    expect(panel).toHaveTextContent('Do not store sensitive values.');
  });

  it('GIVEN warning entries but warning-enabled is false WHEN the page loads THEN the warning panel is hidden', async () => {
    renderDemo({ 'warning-enabled': 'false', 'warning-title': 'Hidden warning' });

    await screen.findByRole('heading', { name: DEFAULTS.header });
    expect(screen.queryByText('Hidden warning')).not.toBeInTheDocument();
  });

  it('GIVEN cta-label and support-endpoint WHEN the page loads THEN the CTA links to the endpoint', async () => {
    renderDemo({
      'cta-label': 'Open the API documentation',
      'support-endpoint': 'http://okvns.test/api/docs',
    });

    const cta = await screen.findByRole('link', { name: /Open the API documentation/ });
    expect(cta).toHaveAttribute('href', 'http://okvns.test/api/docs');
  });
});
