# ADR-0001: Use a pnpm TypeScript Monorepo

## Status

Accepted

## Context

OKVNS includes domain logic, application use cases, YAML parsing, a REST API, and an admin frontend. These parts must share stable types while keeping clear ownership boundaries.

The project also needs consistent scripts for build, lint, unit tests, coverage, and E2E workflows.

## Decision

Use a single TypeScript monorepo managed by pnpm workspaces.

The workspace contains:

- `packages/shared` for framework-independent shared types and helpers.
- `packages/domain` for entities, value objects, invariants, and business errors.
- `packages/application` for use cases and repository ports.
- `packages/yaml` for OKVNS YAML parsing and serialization.
- `apps/api` for the NestJS REST API.
- `apps/admin-web` for the React/Vite admin frontend.

## Consequences

- Shared contracts can be versioned and tested with the application in one repository.
- Package boundaries remain explicit through workspace dependencies.
- Root commands can run repository-wide checks.
- Changes that cross packages require care to preserve dependency direction and avoid accidental coupling.
