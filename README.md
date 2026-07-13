# OKVNS TFM Project

TFM project for "Master en desarrollo con IA" by BigSchool.

OKVNS (Organized Key-Value NamespaceS) is a runtime configuration platform that lets services and applications read centrally managed UTF-8 key-value settings from named namespaces, so operators can change behavior without redeploying the consuming apps.

## For Contributors

This repository is a TypeScript pnpm monorepo with a NestJS API, React/Vite admin frontend, and shared packages organized by clean-architecture boundaries.

Start here when contributing code:

- Read the architecture boundaries before changing package dependencies.
- Use the API and YAML reference when changing contracts.
- Follow testing and implementation expectations.
- Use deployment docs for Docker Compose and Kubernetes.

## Documentation Index

| Document                                                                                                                   | Purpose                                                                                              |
| -------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------- |
| [`docs/api-and-yaml.md`](docs/api-and-yaml.md)                                                                             | REST endpoint reference, name rules, error shape, and YAML import/export contract.                   |
| [`docs/architecture.md`](docs/architecture.md)                                                                             | Workspace layout, clean-architecture boundaries, runtime configuration, and cloud-native principles. |
| [`docs/deployment.md`](docs/deployment.md)                                                                                 | Docker Compose and Kubernetes deployment instructions and constraints.                               |
| [`docs/engineering-practices.md`](docs/engineering-practices.md)                                                           | Implementation, testing, BDD naming, coverage, and security expectations.                            |
| [`docs/adr/README.md`](docs/adr/README.md)                                                                                 | Architecture Decision Record index.                                                                  |
| [`docs/adr/0001-use-pnpm-typescript-monorepo.md`](docs/adr/0001-use-pnpm-typescript-monorepo.md)                           | Decision to use a pnpm TypeScript monorepo.                                                          |
| [`docs/adr/0002-use-clean-architecture-boundaries.md`](docs/adr/0002-use-clean-architecture-boundaries.md)                 | Decision to enforce clean architecture dependency boundaries.                                        |
| [`docs/adr/0003-use-in-memory-storage-for-mvp.md`](docs/adr/0003-use-in-memory-storage-for-mvp.md)                         | Decision to keep MVP storage in memory only (superseded by ADR-0008).                                |
| [`docs/adr/0004-use-strict-okvns-yaml-contract.md`](docs/adr/0004-use-strict-okvns-yaml-contract.md)                       | Decision to use strict OKVNS YAML import/export validation.                                          |
| [`docs/adr/0005-use-nestjs-api-and-react-vite-admin.md`](docs/adr/0005-use-nestjs-api-and-react-vite-admin.md)             | Decision to use NestJS for the API and React/Vite for the admin frontend.                            |
| [`docs/adr/0006-use-containerized-stateless-deployment.md`](docs/adr/0006-use-containerized-stateless-deployment.md)       | Decision to package and deploy stateless containers.                                                 |
| [`docs/adr/0007-use-layered-test-strategy-and-safe-errors.md`](docs/adr/0007-use-layered-test-strategy-and-safe-errors.md) | Decision to use layered verification and safe API error responses.                                   |
| [`docs/adr/0008-use-mysql-for-durable-storage.md`](docs/adr/0008-use-mysql-for-durable-storage.md)                         | Decision to use MySQL for durable storage.                                                           |

## Current Constraints

- Storage is durable in **MySQL**: namespaces and entries survive API restarts. The default runtime requires a reachable MySQL database (see Runtime Configuration). A non-durable `OKVNS_STORAGE_DRIVER=memory` profile remains for fast local demos and tests.
- There is no authentication or authorization in the first implementation.
- Beyond MySQL there is no Redis, queue, or filesystem-backed persistence.
- YAML import accepts canonical `namespaces: [...]` and legacy single `namespace: ...`; export always uses `namespaces: [...]`.

## Workspace Layout

| Path                     | Role                                                       |
| ------------------------ | ---------------------------------------------------------- |
| `packages/shared`        | Framework-independent types, constants, and helpers.       |
| `packages/domain`        | Entities, value objects, invariants, and business errors.  |
| `packages/application`   | Use cases and repository ports.                            |
| `packages/yaml`          | Strict OKVNS YAML parser and serializer.                   |
| `packages/okvns-wrapper` | External TypeScript client for reading entry values.       |
| `apps/api`               | NestJS REST API, MySQL repository adapter, and migrations. |
| `apps/admin-web`         | React + Vite admin frontend.                               |
| `deploy/k8s`             | Kubernetes reference manifests.                            |
| `e2e`                    | Playwright browser workflows.                              |

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

The API defaults to the durable MySQL backend. For local development you can
either run MySQL yourself and apply migrations, or use the non-durable in-memory
profile for a quick demo.

With MySQL (durable) — start a database, then apply the schema:

```bash
# Example local MySQL via Docker:
docker run --name okvns-mysql -e MYSQL_ROOT_PASSWORD=root -e MYSQL_DATABASE=okvns \
  -e MYSQL_USER=okvns -e MYSQL_PASSWORD=okvns -p 3306:3306 -d mysql:8.4

export OKVNS_MYSQL_HOST=127.0.0.1 OKVNS_MYSQL_DATABASE=okvns \
  OKVNS_MYSQL_USER=okvns OKVNS_MYSQL_PASSWORD=okvns
pnpm --filter @okvns/api run migrate   # create/upgrade tables
```

Without MySQL (non-durable, fast demos): set `OKVNS_STORAGE_DRIVER=memory`.

Run the API and admin frontend in separate terminals:

```bash
pnpm --filter @okvns/api run start:dev
pnpm --filter @okvns/admin-web run dev
```

Local URLs:

| Service       | URL                               |
| ------------- | --------------------------------- |
| API           | `http://localhost:3000`           |
| API docs (UI) | `http://localhost:3000/docs`      |
| OpenAPI JSON  | `http://localhost:3000/docs-json` |
| Admin web     | `http://localhost:5173`           |

## Common Commands

```bash
pnpm lint
pnpm typecheck
pnpm test
pnpm test:coverage
pnpm build
```

Playwright E2E:

```bash
pnpm test:e2e:install
docker compose up -d mysql
pnpm test:e2e
```

`pnpm test:e2e` runs API migrations before starting the API web server. The
Compose `mysql` service exposes `127.0.0.1:3306` with database/user/password
`okvns`, matching the Playwright E2E defaults. Use `docker compose down` when
you are done, or `docker compose down -v` to also remove the local MySQL data.

Docker Compose:

```bash
docker compose up --build
```

## Runtime Configuration

| Variable                         | Default                 | Used by                                        |
| -------------------------------- | ----------------------- | ---------------------------------------------- |
| `OKVNS_API_PORT`                 | `3000`                  | API                                            |
| `OKVNS_CORS_ORIGIN`              | `*`                     | API                                            |
| `OKVNS_STORAGE_DRIVER`           | `mysql`                 | API (`mysql` durable, or `memory` non-durable) |
| `OKVNS_MYSQL_HOST`               | _(required for mysql)_  | API + migrations                               |
| `OKVNS_MYSQL_PORT`               | `3306`                  | API + migrations                               |
| `OKVNS_MYSQL_DATABASE`           | _(required for mysql)_  | API + migrations                               |
| `OKVNS_MYSQL_USER`               | _(required for mysql)_  | API + migrations                               |
| `OKVNS_MYSQL_PASSWORD`           | `` (empty)              | API + migrations                               |
| `OKVNS_MYSQL_POOL_LIMIT`         | `10`                    | API connection pool size                       |
| `OKVNS_MYSQL_CONNECT_TIMEOUT_MS` | `10000`                 | API connection timeout                         |
| `VITE_OKVNS_API_BASE_URL`        | `http://localhost:3000` | Admin web local build/dev                      |
| `OKVNS_API_BASE_URL`             | `http://localhost:3000` | Admin web container runtime                    |

When `OKVNS_STORAGE_DRIVER=mysql` (the default), missing `OKVNS_MYSQL_HOST`,
`OKVNS_MYSQL_DATABASE`, or `OKVNS_MYSQL_USER` cause the API to fail startup with
a clear configuration error.

## OpenSpec Workflow

Main specs live under `openspec/specs/`.

Archived change artifacts live under `openspec/changes/archive/`.

When adding or changing capabilities, create a new OpenSpec change before implementation, keep tasks aligned with the specs/design, then sync and archive the change after verification.
