# OKVNS Demo Webapp

One-page React/Vite demo that reads display text from OKVNS through
`@okvns/wrapper`.

## Build

From the repository root:

```powershell
pnpm --filter @okvns/demo-web build
```

To build every package and app in the workspace:

```powershell
pnpm build
```

## Validate

From the repository root:

```powershell
pnpm --filter @okvns/demo-web lint
pnpm --filter @okvns/demo-web test
pnpm --filter @okvns/demo-web build
docker compose -f docker-compose.demo.yml config
```

For full workspace validation:

```powershell
pnpm lint
pnpm test
pnpm build
```

## Start The Docker Demo Stack

From the repository root:

```powershell
docker compose -f docker-compose.demo.yml up --build
```

The demo stack exposes:

- API: `http://localhost:3001`
- Admin webapp: `http://localhost:8082`
- Demo webapp: `http://localhost:8083`
- MySQL: `localhost:3307`

The demo webapp reads the `header`, `tagline`, `use-case-mode`, `body-headline`,
`body-content`, `banner-enabled`, `banner-message`, `warning-enabled`,
`warning-title`, `warning-description`, `cta-label`, `support-endpoint` and
`footer-copyright` entries of the `demo-consumer` namespace, falling back to the
defaults in `src/demo-copy.ts` when an entry is missing. Import
`docs/tfm/okvns-demo-use-cases.yaml` in the admin webapp to populate it. See
`openspec/specs/demo-web/spec.md`.

Stop the stack with:

```powershell
docker compose -f docker-compose.demo.yml down
```

Reset stored demo data with:

```powershell
docker compose -f docker-compose.demo.yml down -v
```
