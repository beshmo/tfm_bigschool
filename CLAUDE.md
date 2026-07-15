# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## What this is

OKVNS: organizes UTF-8 key-value entries inside named namespaces, exposed via a NestJS REST API and a React/Vite admin frontend. A pnpm workspace organized by clean-architecture layers. **Storage is durable in MySQL** (default runtime; see ADR-0008) — namespaces and entries survive restarts. A non-durable `OKVNS_STORAGE_DRIVER=memory` profile and an in-memory fake repository remain for fast demos and tests. There is still **no auth**, and no Redis/queues. MySQL types stay inside `apps/api` infrastructure (`src/infrastructure/mysql/`); domain/application/yaml packages must remain persistence-free.

## Commands

```bash
pnpm install                 # Node >=22, pnpm 11 (corepack enable)

pnpm build                   # build all packages + apps (topological)
pnpm lint                    # ESLint across the workspace
pnpm test                    # unit + API contract tests, all packages
pnpm test:coverage           # same, with coverage thresholds enforced

pnpm test:e2e:install        # one-time: install Playwright chromium
pnpm test:e2e                # builds api + admin (build:e2e), then Playwright

# Scope work to one package (much faster than the whole workspace):
pnpm --filter @okvns/domain run test
pnpm --filter @okvns/api run test
pnpm --filter @okvns/admin-web run test

# Run a single test file / single test:
pnpm --filter @okvns/domain exec vitest run src/namespace.test.ts
pnpm --filter @okvns/domain exec vitest run -t "Duplicate entry"

# Run one E2E spec (servers auto-start via playwright.config webServer):
pnpm exec playwright test e2e/namespaces.spec.ts

# Local dev servers:
pnpm --filter @okvns/api run start:dev      # http://localhost:3000
pnpm --filter @okvns/admin-web run dev      # http://localhost:5173

# MySQL: apply schema migrations (needs OKVNS_MYSQL_* env set). Or use memory:
pnpm --filter @okvns/api run migrate        # plain-SQL runner, scripts/migrate.mjs
OKVNS_STORAGE_DRIVER=memory pnpm --filter @okvns/api run start:dev  # non-durable demo
```

The API default runtime uses MySQL and **fails startup** if `OKVNS_MYSQL_HOST/DATABASE/USER` are missing (unless `OKVNS_STORAGE_DRIVER=memory`). API tests default to the `memory` driver via `apps/api/test/setup.ts`; MySQL adapter/contract tests are gated on `OKVNS_TEST_MYSQL_*` and skip otherwise.

Package builds must exist before running the API (`apps/api` imports the built `dist` of the workspace packages). `pnpm build` handles ordering; after editing a package, rebuild it (or the whole workspace) before running the API or E2E.

## Architecture and dependency rules

Layers, strictly one-directional (`shared` ← `domain` ← `application` → `yaml`; apps are adapters on top):

- `packages/shared` — framework-independent DTO types, constants (`RESOURCE_NAME_PATTERN`, size limits, `ERROR_CODES`), and `compareNames`. No business flows.
- `packages/domain` — `Namespace`/`Entry`/`ResourceName` value objects/entities and typed `DomainError` subclasses. **Must not import** NestJS, React, HTTP, persistence, or browser APIs. Enforced at 100% coverage.
- `packages/application` — use cases + the `NamespaceRepository` port. Depends only on domain/yaml/shared, never on infrastructure. 100% coverage.
- `packages/yaml` — strict OKVNS YAML parser/serializer. Throws its own `YamlError` (carrying an `ERROR_CODES` code), not domain errors. 100% coverage.
- `apps/api` — NestJS presentation + persistence adapters. `PersistenceModule` (`src/infrastructure/persistence.module.ts`) wires the `NAMESPACE_REPOSITORY` token and readiness indicator from `OKVNS_STORAGE_DRIVER` (MySQL adapter in `src/infrastructure/mysql/`, or the in-memory adapter). Use cases are wired in `app.module.ts` via `useCaseProvider(...)`. The `NamespaceRepository` port has transaction-oriented methods: `create` (insert, unique-constraint backed), atomic `rename`, and atomic `importNamespaces`.
- `apps/admin-web` — React. **API request/response mapping is isolated** in `src/api/` (`HttpOkvnsApi` implements the `OkvnsApi` port); components consume it through `useApi()` context and never touch `fetch`/status codes directly.

### Error handling contract

Every error surfaces as a safe shape `{ error: { code, message, details? } }` with **no stack traces**. `apps/api/src/common/domain-exception.filter.ts` maps `DomainError`, `YamlError`, and Nest `HttpException` to this shape; `STATUS_BY_CODE` in `common/api-error.ts` is the single source of truth for code→HTTP-status. When adding a new error, add its code in `shared`, its status in `STATUS_BY_CODE`, and cover it in the API contract tests.

### YAML import semantics

Import validates the **entire** document before mutating anything (atomic) and **upserts by namespace name** — an existing namespace's entries are fully replaced. Canonical/export shape is `namespaces: [...]`; the single `namespace: {...}` shape is accepted only on import. Export emits raw YAML (no markdown code fence). `ImportYamlUseCase` builds fresh aggregates before any `repository.save`, so a mid-document failure leaves storage untouched — preserve that ordering.

## Critical gotchas (learned the hard way)

- **ESM/CJS interop:** the four `packages/*` are ESM (`"type": "module"`), but `apps/api` is CommonJS. This works only because each package's `exports` has a `require` condition and Node 22's `require(ESM)` loads it. Keep the `require` condition when editing package manifests. The API's `express` is a direct dependency (pnpm doesn't hoist it).
- **Frontend `fetch` binding:** never call the injected `fetchImpl` such that native `fetch` gets a non-global `this` — it throws "Illegal invocation", which the client mislabels as a network error. `HttpOkvnsApi` wraps the default fetch for this reason (see `src/api/okvns-api.ts`). Unit tests inject a bound mock and won't catch a regression; E2E will.
- **Coverage is enforced at 100%** for domain/application/yaml via each package's `vitest.config.ts`. New branches need tests or the build fails. Test doubles live under `src/testing/**` and are excluded from coverage.
- **Admin runtime config:** the API base URL resolves from `window.__OKVNS_API_BASE_URL__` (container-injected via `public/env.js`/`docker-entrypoint.sh`), then build-time `VITE_OKVNS_API_BASE_URL`, then a default. E2E builds with `--mode e2e` (`.env.e2e` pins `127.0.0.1:3000`, because headless chromium here can't resolve `localhost` for cross-port fetch).

## Conventions

- Tests are BDD-style (`GIVEN ... WHEN ... THEN ...`) and colocated as `*.test.ts(x)` next to source.
- API tests use Vitest + `unplugin-swc` (for decorators) + supertest, not Jest; build the shared app config via `applyGlobals` so tests and `main.ts` behave identically.
- Deterministic ordering everywhere uses `compareNames` (locale-independent), not `localeCompare`.

## Admin frontend design system

`apps/admin-web/src/styles.css` vendors the **Industry** design system (the `Industry` Claude design project) — a steel-blue wireframe look. Its token sheet is the source of truth: take every color, font, spacing, radius and shadow from a `var(--color-*)` / `--font-*` / `--space-*` / `--radius-*` / `--shadow-*` variable, and never hard-code a hex, font name, or raw px the tokens already carry. Build with the system's classes (`.btn`, `.input`, `.field`, `.card`, `.table`, `.tag`, `.dialog`, `.nav`) rather than inventing parallel ones.

Cards, panels, figures and the primary button are _blueprint objects_: square-cornered, hairline-bordered, and wearing four `+` registration marks — the `.blueprint` class plus a `<Corners />` child. Never drop the marks from a framed element, and never round or surface-fill a card. Icons are Lucide at stroke-width 1.5, inlined in `components/Icon.tsx`.

Dates render through `components/Timestamps.tsx`, which pins `Intl` to `en-US`/UTC so output stays identical on every machine (tests and E2E depend on this) while `<time dateTime>` keeps the API's exact ISO instant.

## OpenSpec

Change specs live in `openspec/`. This project uses the `spec-driven` schema; drive implementation via `/opsx:apply` (or the tasks in `openspec/changes/<name>/tasks.md`). `AGENTS.md` holds the confirmed stack decisions and MVP constraints.
