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

The demo webapp reads:

- `demo.header`, default `demo webapp`
- `demo.body_content_usecase`, where `1` shows use case #1 and any other value shows lorem ipsum
- `demo.footer_copyright`, default `Copyright 2026 OKVNS demo.`

Stop the stack with:

```powershell
docker compose -f docker-compose.demo.yml down
```

Reset stored demo data with:

```powershell
docker compose -f docker-compose.demo.yml down -v
```
