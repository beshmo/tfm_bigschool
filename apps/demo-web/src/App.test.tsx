import { render, screen } from '@testing-library/react';
import { OkvnsWrapper, type FetchLike, type FetchLikeResponse } from '@okvns/wrapper';
import { App } from './App';
import { DEFAULT_HEADER, STANDARD_BODY, USE_CASE_1 } from './demo-copy';

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
  it('GIVEN no demo header entry WHEN the page loads THEN the default header is shown', async () => {
    renderDemo({});

    expect(await screen.findByRole('heading', { name: DEFAULT_HEADER })).toBeInTheDocument();
  });

  it('GIVEN body_content_usecase is 1 WHEN the page loads THEN use case #1 content is shown', async () => {
    renderDemo({ body_content_usecase: '1' });

    expect(await screen.findByText(USE_CASE_1)).toBeInTheDocument();
  });

  it('GIVEN body_content_usecase is not 1 WHEN the page loads THEN standard lorem ipsum is shown', async () => {
    renderDemo({ body_content_usecase: '2' });

    expect(await screen.findByText(STANDARD_BODY)).toBeInTheDocument();
  });

  it('GIVEN footer_copyright exists WHEN the page loads THEN footer uses the entry value', async () => {
    renderDemo({ footer_copyright: 'Copyright 2026 Example Corp.' });

    expect(await screen.findByText('Copyright 2026 Example Corp.')).toBeInTheDocument();
  });
});
