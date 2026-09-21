import { useEffect, useState } from 'react';
import type { OkvnsWrapper } from '@okvns/wrapper';
import {
  DEMO_DEFAULTS,
  DEMO_DISCLAIMER,
  DEMO_ENTRY_KEYS,
  DEMO_NAMESPACE,
  type DemoContent,
} from './demo-copy';

type Reader = Pick<OkvnsWrapper, 'read'>;

type State =
  | { status: 'loading' }
  | { status: 'ready'; content: DemoContent }
  | { status: 'failed'; message: string };

const isTrue = (value: string) => value.trim().toLowerCase() === 'true';

/** Keeps the variant class a single safe token even if the stored value is unusual. */
const variantOf = (mode: string) => `variant-${mode.trim().replace(/[^A-Za-z0-9_-]/g, '-')}`;

function Corners() {
  return (
    <>
      <i className="corner tl" aria-hidden="true" />
      <i className="corner tr" aria-hidden="true" />
      <i className="corner bl" aria-hidden="true" />
      <i className="corner br" aria-hidden="true" />
    </>
  );
}

/** Reads every entry of the demo-consumer namespace through the wrapper. */
async function loadContent(wrapper: Reader): Promise<DemoContent> {
  const values = await Promise.all(
    DEMO_ENTRY_KEYS.map((key) => wrapper.read(DEMO_NAMESPACE, key, DEMO_DEFAULTS[key])),
  );
  return Object.fromEntries(
    DEMO_ENTRY_KEYS.map((key, index) => [key, values[index]]),
  ) as DemoContent;
}

export function App({ wrapper }: { wrapper: Reader }) {
  const [state, setState] = useState<State>({ status: 'loading' });

  useEffect(() => {
    let active = true;
    loadContent(wrapper).then(
      (content) => {
        if (active) setState({ status: 'ready', content });
      },
      (error: unknown) => {
        if (active) {
          setState({
            status: 'failed',
            message: error instanceof Error ? error.message : 'Unknown error',
          });
        }
      },
    );
    return () => {
      active = false;
    };
  }, [wrapper]);

  if (state.status === 'loading') {
    return (
      <p className="loading" role="status">
        Loading content from OKVNS...
      </p>
    );
  }

  // A failed load keeps the page usable: every entry falls back to its default.
  const content: DemoContent = state.status === 'ready' ? state.content : { ...DEMO_DEFAULTS };
  const mode = content['use-case-mode'];
  const showBanner = isTrue(content['banner-enabled']) && content['banner-message'] !== '';
  const showWarning = isTrue(content['warning-enabled']) && content['warning-title'] !== '';

  return (
    <div className={`demo ${variantOf(mode)}`}>
      {state.status === 'failed' ? (
        <div className="load-error" role="alert">
          Unable to load OKVNS demo entries: {state.message}
        </div>
      ) : null}
      {showBanner ? (
        <div className="banner" role="status">
          {content['banner-message']}
        </div>
      ) : null}

      <header className="hero">
        <p className="eyebrow">{content.tagline}</p>
        <h1>{content.header}</h1>
      </header>

      {showWarning ? (
        <section className="warning blueprint" role="alert">
          <Corners />
          <h2>{content['warning-title']}</h2>
          {content['warning-description'] !== '' ? <p>{content['warning-description']}</p> : null}
        </section>
      ) : null}

      <main className="body blueprint">
        <Corners />
        <p className="mode">Use case #{mode}</p>
        <h2>{content['body-headline']}</h2>
        <p>{content['body-content']}</p>
        <a
          className="btn btn-primary blueprint"
          href={content['support-endpoint']}
          target="_blank"
          rel="noopener noreferrer"
        >
          <Corners />
          {content['cta-label']}
        </a>
      </main>

      <footer className="foot">
        <p>{DEMO_DISCLAIMER}</p>
        <p>{content['footer-copyright']}</p>
      </footer>
    </div>
  );
}
