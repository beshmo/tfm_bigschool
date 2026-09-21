import { OkvnsWrapper } from '@okvns/wrapper';
import { render, screen, waitFor } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { App } from './App';
import { DEMO_DEFAULTS, DEMO_ENTRY_KEYS, DEMO_NAMESPACE } from './demo-copy';
import { DEFAULT_API_BASE_URL, resolveApiBaseUrl } from './config';

/** A reader backed by a map: missing keys resolve to the caller's default, like the real wrapper. */
function readerOf(values: Record<string, string>) {
  return {
    read: vi.fn(
      async (_namespace: string, entry: string, fallback: string) => values[entry] ?? fallback,
    ),
  };
}

const LIVE = {
  header: 'OKVNS live configuration demo',
  tagline: 'Every word on this page is served from OKVNS.',
  'use-case-mode': '1',
  'body-headline': 'Change this page without a deployment',
  'body-content': 'The paragraph is read at runtime.',
  'banner-enabled': 'true',
  'banner-message': 'Live demo banner',
  'warning-enabled': 'true',
  'warning-title': 'No authentication',
  'warning-description': 'Do not store real values.',
  'cta-label': 'Open the API documentation',
  'support-endpoint': 'http://okvns.example/api/docs',
  'footer-copyright': 'Copyright 2026 OKVNS TFM demo.',
};

describe('App content', () => {
  it('GIVEN the page WHEN it loads THEN it reads each demo-consumer entry through the wrapper', async () => {
    const wrapper = readerOf(LIVE);

    render(<App wrapper={wrapper} />);

    expect(screen.getByRole('status')).toHaveTextContent('Loading content from OKVNS...');
    await screen.findByRole('heading', { name: 'OKVNS live configuration demo' });
    expect(wrapper.read).toHaveBeenCalledTimes(13);
    expect(wrapper.read.mock.calls.map((call) => call[0])).toEqual(Array(13).fill(DEMO_NAMESPACE));
    expect(wrapper.read.mock.calls.map((call) => call[1])).toEqual([
      'header',
      'tagline',
      'use-case-mode',
      'body-headline',
      'body-content',
      'banner-enabled',
      'banner-message',
      'warning-enabled',
      'warning-title',
      'warning-description',
      'cta-label',
      'support-endpoint',
      'footer-copyright',
    ]);
    expect(
      wrapper.read.mock.calls.every(
        (call, index) => call[2] === DEMO_DEFAULTS[DEMO_ENTRY_KEYS[index]!],
      ),
    ).toBe(true);
  });

  it('GIVEN live values WHEN rendered THEN header, tagline, body, CTA and footer come from OKVNS', async () => {
    render(<App wrapper={readerOf(LIVE)} />);

    expect(await screen.findByRole('heading', { level: 1 })).toHaveTextContent(
      'OKVNS live configuration demo',
    );
    expect(screen.getByText('Every word on this page is served from OKVNS.')).toBeInTheDocument();
    expect(
      screen.getByRole('heading', { name: 'Change this page without a deployment' }),
    ).toBeInTheDocument();
    expect(screen.getByText('The paragraph is read at runtime.')).toBeInTheDocument();
    expect(screen.getByText('Use case #1')).toBeInTheDocument();
    expect(screen.getByText('Copyright 2026 OKVNS TFM demo.')).toBeInTheDocument();
  });

  it('GIVEN no entries in OKVNS WHEN rendered THEN every default from demo-copy is shown', async () => {
    render(<App wrapper={readerOf({})} />);

    expect(await screen.findByRole('heading', { level: 1 })).toHaveTextContent(
      'OKVNS demo consumer',
    );
    expect(screen.getByText('Use case #0')).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Learn more' })).toBeInTheDocument();
    expect(screen.getByText('Copyright 2026 OKVNS demo.')).toBeInTheDocument();
    expect(screen.queryByRole('alert')).not.toBeInTheDocument();
  });

  it('GIVEN only some entries WHEN rendered THEN missing ones fall back individually', async () => {
    render(<App wrapper={readerOf({ header: 'Custom header' })} />);

    expect(await screen.findByRole('heading', { level: 1 })).toHaveTextContent('Custom header');
    expect(screen.getByRole('link', { name: 'Learn more' })).toBeInTheDocument();
  });
});

describe('App failure', () => {
  it('GIVEN a wrapper error WHEN loading fails THEN defaults show with an alert naming the message', async () => {
    const wrapper = {
      read: vi.fn(async () => {
        throw new Error('Could not reach the OKVNS API at http://api.');
      }),
    };

    render(<App wrapper={wrapper} />);

    expect(await screen.findByRole('alert')).toHaveTextContent(
      'Unable to load OKVNS demo entries: Could not reach the OKVNS API at http://api.',
    );
    expect(screen.getByRole('heading', { level: 1 })).toHaveTextContent('OKVNS demo consumer');
    expect(screen.getByText('Copyright 2026 OKVNS demo.')).toBeInTheDocument();
  });

  it('GIVEN a non-Error rejection WHEN loading fails THEN a generic message is used', async () => {
    render(<App wrapper={{ read: vi.fn(async () => Promise.reject('boom')) }} />);

    expect(await screen.findByRole('alert')).toHaveTextContent(
      'Unable to load OKVNS demo entries: Unknown error',
    );
  });

  it('GIVEN a failure WHEN the wrapper changes before it settles THEN the stale result is ignored', async () => {
    let rejectFirst: (error: Error) => void = () => undefined;
    const first = { read: vi.fn(() => new Promise<string>((_, reject) => (rejectFirst = reject))) };
    const { rerender } = render(<App wrapper={first} />);

    rerender(<App wrapper={readerOf({ header: 'Second' })} />);
    rejectFirst(new Error('late failure'));

    expect(await screen.findByRole('heading', { level: 1 })).toHaveTextContent('Second');
    expect(screen.queryByRole('alert')).not.toBeInTheDocument();
  });

  it('GIVEN an unmount WHEN the load finishes later THEN nothing throws', async () => {
    let resolve: (value: string) => void = () => undefined;
    const slow = { read: vi.fn(() => new Promise<string>((done) => (resolve = done))) };
    const { unmount } = render(<App wrapper={slow} />);

    unmount();
    resolve('late');

    await waitFor(() => expect(slow.read).toHaveBeenCalled());
  });
});

describe('App sections', () => {
  it('GIVEN the banner flag on WHEN rendered THEN a status banner shows the message at the top', async () => {
    const { container } = render(<App wrapper={readerOf(LIVE)} />);

    const banner = await screen.findByText('Live demo banner');
    expect(banner).toHaveAttribute('role', 'status');
    expect(container.querySelector('.demo')!.firstElementChild).toBe(banner);
  });

  it.each([
    ['the flag is off', { 'banner-enabled': 'false' }],
    ['the message is empty', { 'banner-message': '' }],
    ['the flag is not "true"', { 'banner-enabled': 'yes' }],
  ])('GIVEN the banner WHEN %s THEN it is hidden', async (_label, override) => {
    render(<App wrapper={readerOf({ ...LIVE, ...override })} />);

    await screen.findByRole('heading', { level: 1 });
    expect(screen.queryByText('Live demo banner')).not.toBeInTheDocument();
  });

  it('GIVEN the flag written as " TRUE " WHEN rendered THEN it counts as on', async () => {
    render(<App wrapper={readerOf({ ...LIVE, 'banner-enabled': ' TRUE ' })} />);

    expect(await screen.findByText('Live demo banner')).toBeInTheDocument();
  });

  it('GIVEN the warning flag on WHEN rendered THEN an alert shows the title and description', async () => {
    render(<App wrapper={readerOf(LIVE)} />);

    const warning = await screen.findByRole('alert');
    expect(warning).toHaveTextContent('No authentication');
    expect(warning).toHaveTextContent('Do not store real values.');
  });

  it('GIVEN a warning without a description WHEN rendered THEN only the title shows', async () => {
    render(<App wrapper={readerOf({ ...LIVE, 'warning-description': '' })} />);

    const warning = await screen.findByRole('alert');
    expect(warning).toHaveTextContent('No authentication');
    expect(warning.querySelector('p')).toBeNull();
  });

  it.each([
    ['the flag is off', { 'warning-enabled': 'false' }],
    ['the title is empty', { 'warning-title': '' }],
  ])('GIVEN the warning WHEN %s THEN it is hidden', async (_label, override) => {
    render(<App wrapper={readerOf({ ...LIVE, ...override })} />);

    await screen.findByRole('heading', { level: 1 });
    expect(screen.queryByRole('alert')).not.toBeInTheDocument();
  });

  it('GIVEN a use-case mode WHEN rendered THEN the root carries the variant class', async () => {
    const { container, rerender } = render(<App wrapper={readerOf({ 'use-case-mode': '3' })} />);
    await screen.findByText('Use case #3');
    expect(container.querySelector('.demo')).toHaveClass('variant-3');

    rerender(<App wrapper={readerOf({ 'use-case-mode': ' a b<c ' })} />);
    await waitFor(() => expect(container.querySelector('.demo')).toHaveClass('variant-a-b-c'));
  });

  it('GIVEN the CTA WHEN rendered THEN it opens the support endpoint in a new, isolated tab', async () => {
    render(<App wrapper={readerOf(LIVE)} />);

    const link = await screen.findByRole('link', { name: 'Open the API documentation' });
    expect(link).toHaveAttribute('href', 'http://okvns.example/api/docs');
    expect(link).toHaveAttribute('target', '_blank');
    expect(link).toHaveAttribute('rel', 'noopener noreferrer');
  });

  it('GIVEN the footer WHEN rendered THEN a fixed demo disclaimer and the copyright are shown', async () => {
    render(<App wrapper={readerOf(LIVE)} />);

    const footer = (await screen.findByRole('contentinfo')) as HTMLElement;
    expect(footer).toHaveTextContent('Demonstration only');
    expect(footer).toHaveTextContent('Copyright 2026 OKVNS TFM demo.');
  });
});

describe('App with the real wrapper', () => {
  it('GIVEN an API that answers per entry WHEN rendered THEN live values and defaults mix correctly', async () => {
    const fetch = vi.fn(async (url: string) => {
      const entry = decodeURIComponent(url.split('/entries/')[1]!);
      if (entry === 'header') {
        return {
          ok: true,
          status: 200,
          json: async () => ({ name: 'header', value: 'From the API' }),
        };
      }
      return {
        ok: false,
        status: 404,
        json: async () => ({ error: { code: 'ENTRY_NOT_FOUND', message: 'missing' } }),
      };
    });

    render(<App wrapper={new OkvnsWrapper({ baseUrl: 'http://api.test', fetch })} />);

    expect(await screen.findByRole('heading', { level: 1 })).toHaveTextContent('From the API');
    expect(screen.getByRole('link', { name: 'Learn more' })).toBeInTheDocument();
    expect(fetch.mock.calls[0]![0]).toMatch(
      /^http:\/\/api\.test\/namespaces\/demo-consumer\/entries\//,
    );
  });

  it('GIVEN an unreachable API WHEN rendered THEN the failure alert appears over the defaults', async () => {
    const fetch = vi.fn(async () => {
      throw new TypeError('offline');
    });

    render(<App wrapper={new OkvnsWrapper({ baseUrl: 'http://api.test', fetch })} />);

    expect(await screen.findByRole('alert')).toHaveTextContent(
      'Unable to load OKVNS demo entries: Could not reach',
    );
  });
});

describe('resolveApiBaseUrl', () => {
  it('GIVEN runtime, build-time and default URLs WHEN resolved THEN that is the order of precedence', () => {
    expect(resolveApiBaseUrl({ __OKVNS_API_BASE_URL__: 'https://runtime/' }, 'https://build')).toBe(
      'https://runtime',
    );
    expect(resolveApiBaseUrl({ __OKVNS_API_BASE_URL__: '' }, 'https://build')).toBe(
      'https://build',
    );
    expect(resolveApiBaseUrl({}, undefined)).toBe('http://localhost:3000');
    expect(DEFAULT_API_BASE_URL).toBe('http://localhost:3000');
    expect(typeof resolveApiBaseUrl()).toBe('string');
  });
});
