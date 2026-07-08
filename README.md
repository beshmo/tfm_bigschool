# tfm_bigschool

TFM project for "Master en desarrollo con IA" by BigSchool.

OKVNS (Organized Key-Value NamespaceS) organizes UTF-8 key-value entries inside named namespaces, exposed through a REST API and a React admin frontend.

## For Contributors

This repository is a TypeScript pnpm monorepo with a NestJS API, React/Vite admin frontend, and shared packages organized by clean-architecture boundaries.

Start here when contributing code:

- Read the architecture boundaries before changing package dependencies: [`docs/architecture.md`](docs/architecture.md)
- Use the API and markdown reference when changing contracts: [`docs/api-and-markdown.md`](docs/api-and-markdown.md)
- Follow testing and implementation expectations: [`docs/engineering-practices.md`](docs/engineering-practices.md)
- Use deployment docs for Docker Compose and Kubernetes: [`docs/deployment.md`](docs/deployment.md)

## Current MVP Constraints

- Storage is in-memory only and is lost on API restart.
- There is no authentication or authorization in the first implementation.
- There is no database, Redis, queue, filesystem-backed persistence, persistent volume, or Kubernetes Secret requirement.
- Markdown import accepts canonical `namespaces: [...]` and legacy single `namespace: ...`; export always uses `namespaces: [...]`.

## Workspace Layout

| Path | Role |
| --- | --- |
| `packages/shared` | Framework-independent types, constants, and helpers. |
| `packages/domain` | Entities, value objects, invariants, and business errors. |
| `packages/application` | Use cases and repository ports. |
| `packages/markdown` | Strict OKVNS markdown/YAML parser and serializer. |
| `apps/api` | NestJS REST API and in-memory repository adapter. |
| `apps/admin-web` | React + Vite admin frontend. |
| `deploy/k8s` | Kubernetes reference manifests. |
| `e2e` | Playwright browser workflows. |

## Prerequisites

- Node.js >= 22
- pnpm 11 via Corepack

Enable Corepack if needed:

```bash
corepack enable
```

## Local Development

Install dependencies:

```bash
pnpm install
```

Run the API and admin frontend in separate terminals:

```bash
pnpm --filter @okvns/api run start:dev
pnpm --filter @okvns/admin-web run dev
```

Local URLs:

| Service | URL |
| --- | --- |
| API | `http://localhost:3000` |
| Admin web | `http://localhost:5173` |

## Common Commands

```bash
pnpm lint
pnpm test
pnpm test:coverage
pnpm build
```

Playwright E2E:

```bash
pnpm test:e2e:install
pnpm test:e2e
```

Docker Compose:

```bash
docker compose up --build
```

## Runtime Configuration

| Variable | Default | Used by |
| --- | --- | --- |
| `OKVNS_API_PORT` | `3000` | API |
| `OKVNS_CORS_ORIGIN` | `*` | API |
| `VITE_OKVNS_API_BASE_URL` | `http://localhost:3000` | Admin web local build/dev |
| `OKVNS_API_BASE_URL` | `http://localhost:3000` | Admin web container runtime |

## OpenSpec Workflow

Main specs live under `openspec/specs/`.

Archived change artifacts live under `openspec/changes/archive/`.

When adding or changing capabilities, create a new OpenSpec change before implementation, keep tasks aligned with the specs/design, then sync and archive the change after verification.
