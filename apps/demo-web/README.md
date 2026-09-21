# OKVNS demo consumer (`apps/demo-web`)

A one-page React/Vite app that reads **all of its display text live from OKVNS**
through [`@okvns/wrapper`](../../packages/okvns-wrapper/README.md). It shows
centralized runtime configuration: edit an entry in the admin web, reload the
demo, and the page changes with no build and no release.

It is a demonstration consumer only and is **not** part of production image
publishing.

## What it reads

Namespace `demo-consumer`, one entry per piece of content:

| Entry                                                     | Built-in default               | Effect                                                    |
| --------------------------------------------------------- | ------------------------------ | --------------------------------------------------------- |
| `header`, `tagline`                                       | `OKVNS demo consumer`, tagline | Page title and eyebrow.                                   |
| `use-case-mode`                                           | `0`                            | Root class `variant-<mode>`, shown as `Use case #<mode>`. |
| `body-headline`, `body-content`                           | placeholder copy               | Main content section.                                     |
| `banner-enabled`, `banner-message`                        | `false`, empty                 | Announcement banner at the top (needs `true` + message).  |
| `warning-enabled`, `warning-title`, `warning-description` | `false`, empty, empty          | Warning panel below the header (needs `true` + title).    |
| `cta-label`, `support-endpoint`                           | `Learn more`, API docs URL     | Call-to-action link, opened in a new tab.                 |
| `footer-copyright`                                        | `Copyright 2026 OKVNS demo.`   | Footer line beside a fixed demo disclaimer.               |

The defaults live in `src/demo-copy.ts`. When an entry (or the whole namespace)
is missing, the wrapper returns the default for that entry; if reading fails for
any other reason the page shows every default plus an alert
`Unable to load OKVNS demo entries: <message>`.

## Populate the namespace

Import `docs/tfm/okvns-demo-use-cases.yaml` (it contains `demo-consumer`) in the
admin web's **Import** page, or through `POST /yaml/import`.

## Configuration

The API base URL resolves from `window.__OKVNS_API_BASE_URL__` (written at
container start from `OKVNS_API_BASE_URL`), then `VITE_OKVNS_API_BASE_URL`, then
`http://localhost:3000`.

## Run it

```bash
pnpm --filter @okvns/demo-web run dev     # http://localhost:5174
pnpm --filter @okvns/demo-web run test
docker compose -f docker-compose.demo.yml up --build   # demo stack, demo on :8083
```
