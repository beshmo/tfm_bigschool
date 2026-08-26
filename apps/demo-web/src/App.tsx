import { useEffect, useState } from 'react';
import { OkvnsWrapper, OkvnsWrapperError } from '@okvns/wrapper';
import { DEFAULTS, DEMO_ENTRIES, DEMO_NAMESPACE } from './demo-copy';

interface DemoConfig {
  header: string;
  tagline: string;
  useCaseMode: string;
  bodyHeadline: string;
  bodyContent: string;
  bannerEnabled: string;
  bannerMessage: string;
  warningEnabled: string;
  warningTitle: string;
  warningDescription: string;
  ctaLabel: string;
  supportEndpoint: string;
  footerCopyright: string;
}

interface DemoState {
  config: DemoConfig;
  isLoading: boolean;
  error: string | null;
}

const DEFAULT_CONFIG: DemoConfig = {
  header: DEFAULTS.header,
  tagline: DEFAULTS.tagline,
  useCaseMode: DEFAULTS.useCaseMode,
  bodyHeadline: DEFAULTS.bodyHeadline,
  bodyContent: DEFAULTS.bodyContent,
  bannerEnabled: DEFAULTS.bannerEnabled,
  bannerMessage: DEFAULTS.bannerMessage,
  warningEnabled: DEFAULTS.warningEnabled,
  warningTitle: DEFAULTS.warningTitle,
  warningDescription: DEFAULTS.warningDescription,
  ctaLabel: DEFAULTS.ctaLabel,
  supportEndpoint: DEFAULTS.supportEndpoint,
  footerCopyright: DEFAULTS.footerCopyright,
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
      const read = (entry: string, fallback: string) => okvns.read(DEMO_NAMESPACE, entry, fallback);

      try {
        const [
          header,
          tagline,
          useCaseMode,
          bodyHeadline,
          bodyContent,
          bannerEnabled,
          bannerMessage,
          warningEnabled,
          warningTitle,
          warningDescription,
          ctaLabel,
          supportEndpoint,
          footerCopyright,
        ] = await Promise.all([
          read(DEMO_ENTRIES.header, DEFAULTS.header),
          read(DEMO_ENTRIES.tagline, DEFAULTS.tagline),
          read(DEMO_ENTRIES.useCaseMode, DEFAULTS.useCaseMode),
          read(DEMO_ENTRIES.bodyHeadline, DEFAULTS.bodyHeadline),
          read(DEMO_ENTRIES.bodyContent, DEFAULTS.bodyContent),
          read(DEMO_ENTRIES.bannerEnabled, DEFAULTS.bannerEnabled),
          read(DEMO_ENTRIES.bannerMessage, DEFAULTS.bannerMessage),
          read(DEMO_ENTRIES.warningEnabled, DEFAULTS.warningEnabled),
          read(DEMO_ENTRIES.warningTitle, DEFAULTS.warningTitle),
          read(DEMO_ENTRIES.warningDescription, DEFAULTS.warningDescription),
          read(DEMO_ENTRIES.ctaLabel, DEFAULTS.ctaLabel),
          read(DEMO_ENTRIES.supportEndpoint, DEFAULTS.supportEndpoint),
          read(DEMO_ENTRIES.footerCopyright, DEFAULTS.footerCopyright),
        ]);

        if (isMounted) {
          setState({
            config: {
              header,
              tagline,
              useCaseMode,
              bodyHeadline,
              bodyContent,
              bannerEnabled,
              bannerMessage,
              warningEnabled,
              warningTitle,
              warningDescription,
              ctaLabel,
              supportEndpoint,
              footerCopyright,
            },
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

  const { config } = state;
  const showBanner = config.bannerEnabled === 'true' && config.bannerMessage.length > 0;
  const showWarning = config.warningEnabled === 'true' && config.warningTitle.length > 0;

  return (
    <div className={`demo-app variant-${config.useCaseMode}`}>
      {showBanner ? (
        <div className="demo-banner" role="status">
          {config.bannerMessage}
        </div>
      ) : null}
      <header className="demo-header">
        <p className="eyebrow">{config.tagline}</p>
        <h1>{config.header}</h1>
      </header>
      {showWarning ? (
        <section className="demo-warning" role="alert">
          <h2 className="demo-warning-title">{config.warningTitle}</h2>
          {config.warningDescription.length > 0 ? (
            <p className="demo-warning-desc">{config.warningDescription}</p>
          ) : null}
        </section>
      ) : null}
      <main className="demo-main">
        {state.isLoading ? <p className="status">Loading content from OKVNS...</p> : null}
        {state.error ? (
          <p className="error" role="alert">
            {state.error}
          </p>
        ) : null}
        <p className="use-case-tag">Use case #{config.useCaseMode}</p>
        <h2 className="body-headline">{config.bodyHeadline}</h2>
        <p className="body-copy">{config.bodyContent}</p>
        <a className="cta" href={config.supportEndpoint} target="_blank" rel="noreferrer">
          {config.ctaLabel}
          <span aria-hidden="true"> →</span>
        </a>
      </main>
      <footer className="demo-footer">
        <p>Demo disclaimer: this page is for demonstration purposes only.</p>
        <p>{config.footerCopyright}</p>
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
