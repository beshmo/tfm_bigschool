import { useEffect, useState } from 'react';
import { OkvnsWrapper, OkvnsWrapperError } from '@okvns/wrapper';
import {
  DEFAULT_BODY_MODE,
  DEFAULT_FOOTER_COPYRIGHT,
  DEFAULT_HEADER,
  STANDARD_BODY,
  USE_CASE_1,
} from './demo-copy';

interface DemoConfig {
  header: string;
  bodyMode: string;
  footerCopyright: string;
}

interface DemoState {
  config: DemoConfig;
  isLoading: boolean;
  error: string | null;
}

const DEFAULT_CONFIG: DemoConfig = {
  header: DEFAULT_HEADER,
  bodyMode: DEFAULT_BODY_MODE,
  footerCopyright: DEFAULT_FOOTER_COPYRIGHT,
};

export interface AppProps {
  okvns: OkvnsWrapper;
}

export function App({ okvns }: AppProps) {
  const [state, setState] = useState<DemoState>({
    config: DEFAULT_CONFIG,
    isLoading: true,
    error: null,
  });

  useEffect(() => {
    let isMounted = true;

    async function loadConfig() {
      try {
        const [header, bodyMode, footerCopyright] = await Promise.all([
          okvns.read('demo', 'header', DEFAULT_HEADER),
          okvns.read('demo', 'body_content_usecase', DEFAULT_BODY_MODE),
          okvns.read('demo', 'footer_copyright', DEFAULT_FOOTER_COPYRIGHT),
        ]);

        if (isMounted) {
          setState({
            config: { header, bodyMode, footerCopyright },
            isLoading: false,
            error: null,
          });
        }
      } catch (error) {
        if (isMounted) {
          setState({
            config: DEFAULT_CONFIG,
            isLoading: false,
            error: toErrorMessage(error),
          });
        }
      }
    }

    void loadConfig();

    return () => {
      isMounted = false;
    };
  }, [okvns]);

  const body = state.config.bodyMode === '1' ? USE_CASE_1 : STANDARD_BODY;

  return (
    <div className="demo-app">
      <header className="demo-header">
        <p className="eyebrow">OKVNS wrapper demo</p>
        <h1>{state.config.header}</h1>
      </header>
      <main className="demo-main">
        {state.isLoading ? <p className="status">Loading content from OKVNS...</p> : null}
        {state.error ? (
          <p className="error" role="alert">
            {state.error}
          </p>
        ) : null}
        <p className="body-copy">{body}</p>
      </main>
      <footer className="demo-footer">
        <p>Demo disclaimer: this page is for demonstration purposes only.</p>
        <p>{state.config.footerCopyright}</p>
      </footer>
    </div>
  );
}

function toErrorMessage(error: unknown): string {
  if (error instanceof OkvnsWrapperError) {
    return `Unable to load OKVNS demo entries: ${error.message}`;
  }
  return 'Unable to load OKVNS demo entries.';
}
