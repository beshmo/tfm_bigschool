## Why

OKVNS needs an initial product foundation for organizing UTF-8 key-value entries into named namespaces, exposing them through an API, and managing them through an admin web frontend. Starting with in-memory storage and no authentication keeps the first implementation small while establishing clean architecture, test coverage, and deployment boundaries for later persistence and security work.

## What Changes

- Add a pnpm monorepo for the OKVNS platform using NestJS for the API and React/Vite for the admin frontend.
- Add clean architecture packages for domain rules, application use cases, markdown import/export, and shared types.
- Add namespace CRUD capabilities with in-memory storage.
- Add entry CRUD capabilities scoped to namespaces with in-memory storage.
- Add markdown import and export for bulk namespace and entry operations, including multiple namespaces per file.
- Add a React admin frontend for namespace, entry, import, and export management.
- Add automated tests by layer, including domain, application, API contract, frontend, and initial Playwright workflows.
- Add simple Docker Compose and Kubernetes deployment assets using in-memory runtime state only.

## Capabilities

### New Capabilities

- `okvns-domain`: Domain model, invariants, validation rules, and business errors for namespaces and entries.
- `namespace-management`: REST and admin UI behavior for listing, creating, reading, updating, and deleting namespaces.
- `entry-management`: REST and admin UI behavior for listing, creating, reading, updating, and deleting entries within a namespace.
- `markdown-bulk-operations`: Markdown import and export behavior for one or more namespaces and their entries.
- `admin-frontend`: React admin frontend behavior for CRUD and bulk operations.
- `deployment-foundation`: Local Docker Compose and baseline Kubernetes resources for the OKVNS API and admin frontend.

### Modified Capabilities

None.

## Impact

- Adds a TypeScript pnpm workspace with NestJS API, React admin frontend, and shared packages.
- Adds HTTP endpoints for namespace CRUD, entry CRUD, health checks, readiness checks, markdown import, and markdown export.
- Adds in-memory repository infrastructure behind application-layer ports.
- Adds validation, safe API error shapes, request size limits, and strict markdown schema handling.
- Adds Vitest/Jest-compatible package tests, API contract tests, React component/API mapping tests, and Playwright E2E workflows.
- Adds Docker Compose and Kubernetes manifests without Redis, databases, or secrets in the first implementation.
