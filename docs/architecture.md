# Architecture

OKVNS is a pnpm monorepo built along clean-architecture boundaries.

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

## Storage Model

Namespaces and entries are stored durably in **MySQL** and survive API restarts
and pod replacement. The schema is two relational tables — `namespaces` and
`entries` — with a unique namespace name, a unique `(namespace_id, entry_name)`,
and `ON DELETE CASCADE` from namespace to entries. Multi-step mutations
(namespace rename, multi-namespace YAML import) run inside a single MySQL
transaction. See [ADR-0008](adr/0008-use-mysql-for-durable-storage.md).

MySQL types stay inside the `apps/api` infrastructure layer (via the `mysql2`
client); domain and YAML packages remain persistence-free. A non-durable
in-memory adapter (`OKVNS_STORAGE_DRIVER=memory`) is retained for fast local
demos and tests. There is still no authentication, authorization, Redis, queue,
or filesystem-backed persistence.

### MySQL Schema

Defined by the plain-SQL files in `apps/api/migrations/`. Both tables are
`ENGINE=InnoDB`, `DEFAULT CHARSET=utf8mb4`, `COLLATE=utf8mb4_bin`, so name
uniqueness is enforced **case- and accent-sensitively** by the database itself.

`namespaces`

| Column        | Type                                                                       | Notes                        |
| ------------- | -------------------------------------------------------------------------- | ---------------------------- |
| `id`          | `BIGINT UNSIGNED AUTO_INCREMENT`                                           | Primary key.                 |
| `name`        | `VARCHAR(128) NOT NULL`                                                    | `UNIQUE uq_namespaces_name`. |
| `description` | `VARCHAR(1000) NULL`                                                       | Added by migration 002.      |
| `created_at`  | `TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP`                             |                              |
| `updated_at`  | `TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP` | Exposed as `modified_at`.    |

`entries`

| Column          | Type                                                                       | Notes                                                          |
| --------------- | -------------------------------------------------------------------------- | -------------------------------------------------------------- |
| `id`            | `BIGINT UNSIGNED AUTO_INCREMENT`                                           | Primary key.                                                   |
| `namespace_id`  | `BIGINT UNSIGNED NOT NULL`                                                 | `fk_entries_namespace` → `namespaces(id)` `ON DELETE CASCADE`. |
| `entry_name`    | `VARCHAR(128) NOT NULL`                                                    | `UNIQUE uq_entries_namespace_name (namespace_id, entry_name)`. |
| `value`         | `MEDIUMTEXT NOT NULL`                                                      |                                                                |
| `description`   | `VARCHAR(1000) NULL`                                                       | Added by migration 002.                                        |
| `env_dependent` | `BOOLEAN NOT NULL DEFAULT FALSE`                                           | Stored as `TINYINT(1)`; added by migration 003.                |
| `created_at`    | `TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP`                             |                                                                |
| `updated_at`    | `TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP` | Exposed as `modified_at`.                                      |

There are no secondary indexes beyond the primary keys, the two unique keys and
the foreign key; name filters are substring matches and do not use an index.
The API serializes timestamps as ISO 8601 UTC strings (`toISOString()`).

### Migration Runner

`apps/api/scripts/migrate.mjs` (`pnpm --filter @okvns/api run migrate`):

- Reads `OKVNS_MYSQL_HOST`, `OKVNS_MYSQL_DATABASE` and `OKVNS_MYSQL_USER`
  (required; a missing one exits 1), `OKVNS_MYSQL_PORT` (default 3306) and
  `OKVNS_MYSQL_PASSWORD` (default empty).
- Creates `schema_migrations(filename VARCHAR(255) PRIMARY KEY, applied_at
TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP)` if missing.
- Applies every `migrations/*.sql` file **in filename order** (`NNN_description.sql`),
  skipping filenames already recorded, and records each filename after its SQL
  succeeds. There is no wrapping transaction (MySQL DDL auto-commits).
- Migrations must be idempotent: `001` uses `CREATE TABLE IF NOT EXISTS`; `002`
  and `003` check `information_schema.COLUMNS` before running `ALTER TABLE`.
- On failure it logs `[migrate] failed: <message>`, exits 1 and stops without
  recording the failed file; a rerun retries it.
- It prints `already up to date` or `applied N migration(s)`.
- It takes no advisory lock, so concurrent runs (for example several pods'
  init containers starting together) rely on migration idempotency.

## Layer Responsibilities

| Layer          | Responsibility                                                                    |
| -------------- | --------------------------------------------------------------------------------- |
| Domain         | Entities, value objects, invariants, validation rules, and business errors.       |
| Application    | Use cases, orchestration, ports, and transaction boundaries.                      |
| Infrastructure | Runtime adapters such as repositories and framework integration.                  |
| Presentation   | REST controllers, React components, DTOs, request/response mapping, and UI state. |

## Dependency Rules

- Domain code must not depend on NestJS, React, browser APIs, persistence clients, HTTP adapters, or framework decorators.
- Application use cases depend on interfaces/ports instead of concrete infrastructure.
- Infrastructure implements application or domain ports.
- Presentation translates transport-specific input/output into application calls.
- Shared packages expose stable types and utilities, not service-specific business flows.

## Runtime Configuration

The API reads:

| Variable                         | Default                | Purpose                                         |
| -------------------------------- | ---------------------- | ----------------------------------------------- |
| `OKVNS_API_PORT`                 | `3000`                 | API listen port.                                |
| `OKVNS_CORS_ORIGIN`              | `*`                    | CORS origin setting.                            |
| `OKVNS_STORAGE_DRIVER`           | `mysql`                | Storage backend: `mysql` (durable) or `memory`. |
| `OKVNS_MYSQL_HOST`               | _(required for mysql)_ | MySQL host.                                     |
| `OKVNS_MYSQL_PORT`               | `3306`                 | MySQL port.                                     |
| `OKVNS_MYSQL_DATABASE`           | _(required for mysql)_ | MySQL database name.                            |
| `OKVNS_MYSQL_USER`               | _(required for mysql)_ | MySQL user.                                     |
| `OKVNS_MYSQL_PASSWORD`           | `` (empty)             | MySQL password.                                 |
| `OKVNS_MYSQL_POOL_LIMIT`         | `10`                   | Max pooled connections.                         |
| `OKVNS_MYSQL_CONNECT_TIMEOUT_MS` | `10000`                | Connection timeout in milliseconds.             |

The admin frontend reads:

| Variable                        | Default                 | Purpose                                                              |
| ------------------------------- | ----------------------- | -------------------------------------------------------------------- |
| `VITE_OKVNS_API_BASE_URL`       | `http://localhost:3000` | Build-time API base URL for local Vite usage.                        |
| `window.__OKVNS_API_BASE_URL__` | none                    | Runtime-injected API base URL generated by the container entrypoint. |

## Cloud-Native Principles

- The API and admin frontend run as stateless processes; durable state lives in the MySQL backing service.
- Runtime configuration is provided through environment variables.
- Services are packaged as Linux containers.
- Logs are written to stdout and stderr.
- Kubernetes is the reference deployment platform.
- Scaling is performed by increasing stateless service replicas.

## Twelve-Factor Alignment

| Factor              | OKVNS Approach                                                                |
| ------------------- | ----------------------------------------------------------------------------- |
| Codebase            | One Git repository for all apps and shared packages.                          |
| Dependencies        | Explicit dependencies per app or package.                                     |
| Configuration       | Environment variables for runtime configuration.                              |
| Backing services    | MySQL is an attached backing service configured via environment variables.    |
| Build, release, run | Build artifacts are produced separately from runtime containers.              |
| Processes           | Services run as stateless processes.                                          |
| Port binding        | Services expose HTTP APIs through network ports.                              |
| Concurrency         | Scaling is achieved through replicas.                                         |
| Disposability       | Services expose health and readiness endpoints.                               |
| Dev/prod parity     | Docker Compose and Kubernetes keep boundaries explicit.                       |
| Logs                | Logs are emitted to stdout and stderr.                                        |
| Admin processes     | Administrative tasks should run as explicit one-off commands when introduced. |

## Package Manifest Checklist

Use this when creating or recreating a workspace package or app.

- **Versions**: `pnpm-lock.yaml` is the source of truth for exact dependency
  versions; `package.json` files carry caret ranges and internal dependencies use
  `workspace:*`. CI and Docker install with `--frozen-lockfile`.
- **Workspace**: `pnpm-workspace.yaml` includes `apps/*` and `packages/*`. The
  root `tsconfig.json` is a solution file with `references` to every package and
  app; `tsconfig.base.json` sets `strict`, `ES2022`, `ESNext`/`Bundler`
  modules and `isolatedModules`.
- **ESM packages** (`shared`, `domain`, `application`, `yaml`, `okvns-wrapper`):
  `"private": true`, `"type": "module"`, `main`/`types` at `./dist`, and an
  `exports["."]` map with `types`, `import` **and `require`** all pointing at
  `./dist/index.js`. The `require` condition is what lets the CommonJS API load
  them through Node 22's `require(ESM)`; never remove it.
- **Scripts** every package exposes: `build` (`tsc -p tsconfig.json`),
  `typecheck` (`tsc --noEmit`), `lint` (`eslint src`), `test` (`vitest run`),
  `test:coverage` (`vitest run --coverage`). The root delegates with `pnpm -r`.
- **`apps/api`** is CommonJS: `tsconfig.json` uses `module: CommonJS`,
  `moduleResolution: Node`, `experimentalDecorators` and `emitDecoratorMetadata`,
  and a separate `tsconfig.build.json` for the build. Tests use Vitest with
  `unplugin-swc` and `test/setup.ts`, which imports `reflect-metadata` and
  defaults `OKVNS_STORAGE_DRIVER` to `memory`.
- **Coverage**: `domain`, `application` and `yaml` use `@vitest/coverage-v8`
  with 100% thresholds for lines, functions, branches and statements in their
  `vitest.config.ts`, excluding `*.test.ts`, `index.ts` and `src/testing/**`.
- **`apps/admin-web`** tests run in jsdom with `src/test/setup.ts` importing
  `@testing-library/jest-dom/vitest`; `build:e2e` builds with `--mode e2e`.
- **Git hooks**: Husky runs `lint-staged` (Prettier for `json/css/md`, Prettier
  and ESLint for `js/jsx/ts/tsx`) on commit.
