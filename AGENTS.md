# tfm_bigschool

TFM project for OKVNS: organized UTF-8 key-value entries inside namespaces.

## Current State

- This repo is still a seed: no root manifests, lockfiles, app code, CI, or build/test commands exist yet.
- Active OpenSpec change: `openspec/changes/build-okvns-service/`; use its `proposal.md`, `design.md`, `tasks.md`, and `specs/**/spec.md` as the implementation contract.
- OpenSpec uses `schema: spec-driven`; before implementing change tasks, prefer `/opsx-apply` or follow `openspec/changes/build-okvns-service/tasks.md` in order.

## Confirmed Stack

- Monorepo: `pnpm` workspace.
- Backend: NestJS API in `apps/api`.
- Frontend: React + Vite admin app in `apps/admin-web`; adapt any older Angular wording in README to React/React Testing Library.
- Packages to create: `packages/domain`, `packages/application`, `packages/yaml`, `packages/shared`.
- Tests: Vitest for packages where practical, React Testing Library for frontend, Playwright for E2E, Nest-compatible HTTP contract tests for API.
- Coverage: package-level `@vitest/coverage-v8`; domain and application target 100%.

## Architecture Rules

- Domain must not import NestJS, React, browser APIs, persistence clients, HTTP adapters, or framework decorators.
- Application use cases depend on ports/interfaces, not infrastructure implementations.
- Infrastructure implements application/domain ports; initial storage is in-memory only.
- Presentation layers map transport/UI input and output to application calls; keep API client mapping isolated from React components.
- Shared packages expose stable types/utilities only, not service-specific business flows.

## MVP Constraints

- No authentication or authorization in the first implementation.
- No Redis, database, queue, filesystem-backed persistence, persistent volumes, or Kubernetes Secrets in the first implementation.
- In-memory state is intentionally lost on restart; do not imply durability.
- YAML import supports canonical `namespaces: [...]` and accepts the original single `namespace: ...` shape; export emits raw YAML using canonical `namespaces: [...]`.
- YAML import validates the full document before mutating state, rejects unexpected keys, duplicate namespaces, duplicate entries, invalid names, non-string values, and oversized payloads.
- Valid imports upsert by namespace name: create missing namespaces and replace entries for existing imported namespaces.

## Verification Notes

- Until package manifests exist, there are no runnable repo commands to trust.
- Once scaffolded, add and document root scripts for `build`, `lint`, `test`, `test:coverage`, and Playwright workflows.
- API contract tests must cover every documented endpoint, validation failures, duplicates, not-found cases, status codes, and safe error shapes.
- Use BDD-style test names when it improves clarity, e.g. `GIVEN valid YAML WHEN it is imported THEN namespaces are stored`.

## Deployment Notes

- Local deployment target: Docker Compose with one API container and one admin frontend container.
- Kubernetes target namespace: `okvns`.
- Runtime configuration should come from environment variables and ConfigMaps; logs go to stdout/stderr.
- API must provide health and readiness endpoints for probes.
