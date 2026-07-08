## 1. Workspace Foundation

- [x] 1.1 Update project guidance with the confirmed NestJS + React stack, pnpm workspace, testing tools, clean architecture rules, and in-memory first storage decision.
- [x] 1.2 Create the pnpm monorepo workspace with `apps/api`, `apps/admin-web`, `packages/domain`, `packages/application`, `packages/markdown`, and `packages/shared`.
- [x] 1.3 Add root TypeScript, ESLint, Prettier, Vitest coverage, Playwright, and workspace scripts for build, lint, test, and coverage.
- [x] 1.4 Add gitignore entries for package installs, build outputs, coverage outputs, Playwright artifacts, and environment files.

## 2. Domain Package

- [x] 2.1 Write failing BDD-style domain tests for namespace name validation, entry name validation, duplicate entries, and explicit business errors.
- [x] 2.2 Implement namespace and entry value objects/entities without NestJS, React, HTTP, persistence, or browser dependencies.
- [x] 2.3 Implement typed domain errors for invalid names, duplicate namespaces, duplicate entries, missing namespaces, missing entries, and invalid markdown shapes.
- [x] 2.4 Configure domain package coverage thresholds at 100% and verify domain tests pass.

## 3. Application Package

- [x] 3.1 Write failing BDD-style use case tests for namespace CRUD through repository ports.
- [x] 3.2 Write failing BDD-style use case tests for entry CRUD within namespaces through repository ports.
- [x] 3.3 Write failing BDD-style use case tests for markdown import atomicity, namespace upsert behavior, and export selection behavior.
- [x] 3.4 Implement repository port interfaces and namespace CRUD use cases.
- [x] 3.5 Implement entry CRUD use cases scoped to namespaces.
- [x] 3.6 Implement import and export use cases that orchestrate markdown parsing/serialization and repository operations.
- [x] 3.7 Configure application package coverage thresholds at 100% and verify application tests pass.

## 4. Markdown Package

- [x] 4.1 Write failing BDD-style markdown tests for canonical `namespaces` import, single `namespace` import, strict key allowlisting, duplicate detection, invalid values, size limits, and canonical export.
- [x] 4.2 Implement safe markdown/YAML parsing with only the OKVNS schema keys allowed.
- [x] 4.3 Implement normalization and validation for multiple namespace documents before mutation is allowed.
- [x] 4.4 Implement canonical markdown serialization using the `namespaces` array shape with deterministic ordering.
- [x] 4.5 Configure markdown package coverage thresholds and verify markdown tests pass.

## 5. API Application

- [x] 5.1 Scaffold the NestJS API app as a presentation/infrastructure adapter over the application package.
- [x] 5.2 Implement the in-memory namespace repository infrastructure adapter behind the application repository port.
- [x] 5.3 Add DTO validation, request body size limits, route parameter validation, safe error mapping, and global exception handling without leaking stack traces.
- [x] 5.4 Implement health and readiness endpoints.
- [x] 5.5 Implement namespace REST endpoints for list, create, get, update, and delete.
- [x] 5.6 Implement entry REST endpoints for list, create, get, update, and delete within namespaces.
- [x] 5.7 Implement markdown import and export REST endpoints for full export and selected namespace export.
- [x] 5.8 Add API contract tests covering every endpoint, status code class, validation failure, not-found case, duplicate case, and safe error shape.

## 6. React Admin Frontend

- [x] 6.1 Scaffold the React/Vite admin frontend with TypeScript, routing, test setup, and environment-based API base URL configuration.
- [x] 6.2 Implement an isolated API client and response/error mappers for namespace, entry, import, and export endpoints.
- [x] 6.3 Write React Testing Library tests for namespace forms, namespace list/detail behavior, API error display, and API client mapping.
- [x] 6.4 Implement namespace list, create, edit, view, and delete UI flows.
- [x] 6.5 Write React Testing Library tests for entry forms, entry list behavior, and validation/API error display.
- [x] 6.6 Implement entry list, create, edit, view, and delete UI flows scoped to a selected namespace.
- [x] 6.7 Write React Testing Library tests for markdown import and export UI behavior.
- [x] 6.8 Implement markdown import UI that preserves invalid submitted content for correction.
- [x] 6.9 Implement markdown export UI for all namespaces and selected namespace copy/download behavior.

## 7. E2E and Coverage

- [x] 7.1 Configure Playwright to run against the local API and admin frontend.
- [x] 7.2 Add E2E workflow for listing, creating, updating, and deleting a namespace.
- [x] 7.3 Add E2E workflow for reading, creating, updating, and deleting an entry within a namespace.
- [x] 7.4 Add E2E workflow for importing markdown containing multiple namespaces and entries.
- [x] 7.5 Add E2E workflow for exporting markdown for all namespaces and for a selected namespace.
- [x] 7.6 Verify package-level coverage commands and root `pnpm test:coverage` behavior.

## 8. Deployment and Documentation

- [x] 8.1 Add Dockerfiles for the API and admin frontend using environment variables for runtime configuration.
- [x] 8.2 Add Docker Compose configuration that starts the API and admin frontend without Redis, databases, queues, persistent volumes, or secrets.
- [x] 8.3 Add Kubernetes manifests for namespace `okvns`, ConfigMaps, API Deployment/Service, admin frontend Deployment/Service, probes, and ingress placeholder.
- [x] 8.4 Document local development commands, Docker Compose startup, Kubernetes apply steps, in-memory storage limitations, API endpoints, markdown schema, and test commands in the README.
- [x] 8.5 Run lint, tests, coverage, build, and E2E verification commands and fix any failures.
