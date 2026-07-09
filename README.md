# OKVNS TFM Project

TFM project for "Master en desarrollo con IA" by BigSchool.

OKVNS (Organized Key-Value NamespaceS) organizes UTF-8 key-value entries inside named namespaces, exposed through a REST API and a React admin frontend.

## For Contributors

This repository is a TypeScript pnpm monorepo with a NestJS API, React/Vite admin frontend, and shared packages organized by clean-architecture boundaries.

Start here when contributing code:

- Read the architecture boundaries before changing package dependencies.
- Use the API and YAML reference when changing contracts.
- Follow testing and implementation expectations.
- Use deployment docs for Docker Compose and Kubernetes.

## Documentation Index

| Document | Purpose |
| --- | --- |
| [`docs/api-and-yaml.md`](docs/api-and-yaml.md) | REST endpoint reference, name rules, error shape, and YAML import/export contract. |
| [`docs/architecture.md`](docs/architecture.md) | Workspace layout, clean-architecture boundaries, runtime configuration, and cloud-native principles. |
| [`docs/deployment.md`](docs/deployment.md) | Docker Compose and Kubernetes deployment instructions and constraints. |
| [`docs/engineering-practices.md`](docs/engineering-practices.md) | Implementation, testing, BDD naming, coverage, and security expectations. |
| [`docs/adr/README.md`](docs/adr/README.md) | Architecture Decision Record index. |
| [`docs/adr/0001-use-pnpm-typescript-monorepo.md`](docs/adr/0001-use-pnpm-typescript-monorepo.md) | Decision to use a pnpm TypeScript monorepo. |
| [`docs/adr/0002-use-clean-architecture-boundaries.md`](docs/adr/0002-use-clean-architecture-boundaries.md) | Decision to enforce clean architecture dependency boundaries. |
| [`docs/adr/0003-use-in-memory-storage-for-mvp.md`](docs/adr/0003-use-in-memory-storage-for-mvp.md) | Decision to keep MVP storage in memory only. |
| [`docs/adr/0004-use-strict-okvns-yaml-contract.md`](docs/adr/0004-use-strict-okvns-yaml-contract.md) | Decision to use strict OKVNS YAML import/export validation. |
| [`docs/adr/0005-use-nestjs-api-and-react-vite-admin.md`](docs/adr/0005-use-nestjs-api-and-react-vite-admin.md) | Decision to use NestJS for the API and React/Vite for the admin frontend. |
| [`docs/adr/0006-use-containerized-stateless-deployment.md`](docs/adr/0006-use-containerized-stateless-deployment.md) | Decision to package and deploy stateless containers. |
| [`docs/adr/0007-use-layered-test-strategy-and-safe-errors.md`](docs/adr/0007-use-layered-test-strategy-and-safe-errors.md) | Decision to use layered verification and safe API error responses. |

## Current MVP Constraints

- Storage is in-memory only and is lost on API restart.
- There is no authentication or authorization in the first implementation.
- There is no database, Redis, queue, filesystem-backed persistence, persistent volume, or Kubernetes Secret requirement.
- YAML import accepts canonical `namespaces: [...]` and legacy single `namespace: ...`; export always uses `namespaces: [...]`.

## Workspace Layout

| Path | Role |
| --- | --- |
| `packages/shared` | Framework-independent types, constants, and helpers. |
| `packages/domain` | Entities, value objects, invariants, and business errors. |
| `packages/application` | Use cases and repository ports. |
| `packages/yaml` | Strict OKVNS YAML parser and serializer. |
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
