## Context

The repository is an empty seed project with no application code, dependencies, CI, or deployment configuration. OKVNS will start as a TypeScript pnpm monorepo with a NestJS API, React/Vite admin frontend, and shared packages organized by clean architecture boundaries. The first storage implementation is in-memory only, and the first release has no authentication or authorization.

The implementation must still establish production-oriented seams: domain code independent from frameworks, application use cases behind ports, infrastructure adapters for runtime dependencies, presentation adapters for HTTP and UI concerns, strict input validation, safe API errors, tests by layer, Docker Compose for local development, and Kubernetes manifests for the reference deployment model.

## Goals / Non-Goals

**Goals:**

- Provide namespace and entry CRUD through a REST API and React admin frontend.
- Support markdown import and export for multiple namespaces per file.
- Keep domain and application packages independent from NestJS and React.
- Use in-memory infrastructure behind repository ports so persistence can be replaced later.
- Add test-first coverage for domain rules, application use cases, markdown behavior, and API contracts where practical.
- Add simple Docker Compose and Kubernetes assets without introducing unnecessary infrastructure.

**Non-Goals:**

- Persistent storage, Redis, queues, workers, filesystem-backed storage, or external databases.
- Authentication, authorization, users, roles, JWT secrets, or protected routes.
- Production-grade secret management.
- Multi-tenant isolation beyond namespace names.
- Advanced markdown dialect support beyond the OKVNS schema.

## Decisions

- Use a pnpm workspace with `apps/*` and `packages/*` because the API, frontend, and shared architecture layers need independent package boundaries while remaining in one repository. Alternative: a single NestJS application with embedded frontend; rejected because it would blur clean architecture and test boundaries.
- Use NestJS for `apps/api` because the selected backend stack provides controllers, validation pipes, dependency injection, health endpoints, and HTTP test support. Alternative: Express/Fastify directly; rejected because it would require more framework assembly for the first implementation.
- Use React/Vite for `apps/admin-web` and adapt all Angular-specific guidance to React Testing Library and React routing patterns. Alternative: Angular; rejected because the confirmed stack is NestJS + React.
- Create `packages/domain`, `packages/application`, `packages/markdown`, and `packages/shared`. Domain contains entities, value objects, invariants, and business errors. Application contains use cases and ports. Markdown contains strict parser/serializer logic. Shared exposes stable API-facing types without business flows.
- Implement the first repository as an in-memory infrastructure adapter registered in the NestJS application. Alternative: Redis or a database placeholder; rejected because the first implementation explicitly uses in-memory storage only.
- Treat markdown import as a replace/upsert bulk operation per namespace name unless a more specific operation is requested later. This keeps import deterministic and useful for repeated admin imports. Duplicate namespaces or entries within the same file MUST be rejected before mutating state.
- Support both a plural root shape and the original single-namespace shape for markdown import/export compatibility. The canonical export shape is `namespaces: [...]`; the single `namespace: ...` shape is accepted only on import.
- Use Vitest for package-level unit tests and coverage where practical. NestJS API contract tests may use the Nest test utilities while keeping behavior names and contract assertions consistent. Alternative: Jest everywhere; acceptable if the Nest scaffold requires it, but package coverage controls should remain aligned with `@vitest/coverage-v8` where practical.
- Add request body size limits and strict schema allowlists even without auth. Alternative: defer security controls until auth; rejected because OWASP-aligned boundary validation is part of the first implementation.

## Risks / Trade-offs

- In-memory storage loses data on restart -> document this explicitly, keep the repository behind a port, and avoid pretending it is durable.
- Import semantics could surprise users if they expect merge instead of replacement -> define API behavior and test duplicate and replacement scenarios.
- Supporting both single and multiple namespace markdown shapes increases parser complexity -> keep export canonical and enforce a small allowlisted schema.
- Full coverage thresholds can slow early scaffolding -> enforce strict domain/application/API expectations first and keep expensive frontend/E2E coverage focused on critical flows.
- Kubernetes manifests for in-memory services are not production-durable -> include health/readiness and stateless deployment patterns, but document that persistence is future work.

## Migration Plan

- Scaffold the monorepo and record the confirmed stack in project guidance.
- Build packages and apps incrementally from domain outward.
- Add tests before or alongside each use case and endpoint.
- Run package tests, API contract tests, frontend tests, and initial E2E workflows.
- Deploy locally with Docker Compose using in-memory runtime state.
- Apply Kubernetes manifests into the `okvns` namespace for a reference deployment.
- Rollback consists of removing the new app, package, and deployment files because this is the initial implementation and no persisted data migration exists.

## Open Questions

- None for the first implementation.
