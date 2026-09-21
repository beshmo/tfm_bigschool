## Purpose

One-page React/Vite demo consumer (`apps/demo-web`) that reads its display text live from OKVNS through `@okvns/wrapper`. It demonstrates centralized runtime configuration and the wrapper's default-value fallback. It is not part of production image publishing.

## Requirements

### Requirement: Demo content read from OKVNS
The demo webapp SHALL read all of its display content from the `demo-consumer` namespace through `OkvnsWrapper.read`, falling back per entry to a built-in default when the entry is missing.

#### Scenario: Entries are read from the demo-consumer namespace
- **WHEN** the demo page loads
- **THEN** it reads the entries `header`, `tagline`, `use-case-mode`, `body-headline`, `body-content`, `banner-enabled`, `banner-message`, `warning-enabled`, `warning-title`, `warning-description`, `cta-label`, `support-endpoint` and `footer-copyright` from namespace `demo-consumer`
- **AND** importing `docs/tfm/okvns-demo-use-cases.yaml` populates that namespace

#### Scenario: Missing entries use built-in defaults
- **WHEN** an entry (or the whole namespace) does not exist
- **THEN** the page renders the default from `src/demo-copy.ts` for that entry, for example header "OKVNS demo consumer", use-case mode `0`, CTA label "Learn more", footer "Copyright 2026 OKVNS demo."

#### Scenario: Load failure keeps the page usable
- **WHEN** reading from OKVNS fails with a wrapper error other than not-found
- **THEN** the page shows all defaults and an alert "Unable to load OKVNS demo entries: <message>"
- **AND** while loading it shows "Loading content from OKVNS..."

### Requirement: Content-driven page sections
The demo webapp SHALL show or hide sections and pick a visual variant purely from the values read.

#### Scenario: Banner and warning toggles
- **WHEN** `banner-enabled` is `true` and `banner-message` is non-empty
- **THEN** a status banner with the message is shown at the top
- **AND** when `warning-enabled` is `true` and `warning-title` is non-empty, an alert section shows the title and, if non-empty, the description

#### Scenario: Use-case variant
- **WHEN** the page renders
- **THEN** the root element carries the class `variant-<use-case-mode>` and the body shows "Use case #<use-case-mode>", the body headline and body content
- **AND** the CTA link labelled by `cta-label` opens `support-endpoint` in a new tab

#### Scenario: Footer
- **WHEN** the page renders
- **THEN** the footer shows a fixed demo disclaimer and the `footer-copyright` value

### Requirement: Runtime API base URL
The demo webapp SHALL resolve the OKVNS API base URL from `window.__OKVNS_API_BASE_URL__`, then `VITE_OKVNS_API_BASE_URL`, then `http://localhost:3000`.

#### Scenario: Container injects the base URL
- **WHEN** the demo container starts
- **THEN** its entrypoint writes `env.js` from the `OKVNS_API_BASE_URL` environment variable, the same mechanism as the admin webapp

### Requirement: Demo stack
The repository SHALL provide `docker-compose.demo.yml` starting MySQL, the API, the admin webapp and the demo webapp on separate host ports.

#### Scenario: Demo stack ports
- **WHEN** the demo stack is started
- **THEN** the API is on port 3001, the admin webapp on 8082, the demo webapp on 8083 and MySQL on 3307
