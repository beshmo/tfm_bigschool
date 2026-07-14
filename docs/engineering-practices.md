# Engineering Practices

## Implementation Guidelines

All implementation work should follow the same engineering practices across frontend, backend apps, and shared packages.

## Clean Architecture

Business capabilities should be organized around explicit boundaries:

| Layer          | Responsibility                                                                    |
| -------------- | --------------------------------------------------------------------------------- |
| Domain         | Entities, value objects, invariants, validation rules, and business errors.       |
| Application    | Use cases, orchestration, ports, and transaction boundaries.                      |
| Infrastructure | Runtime adapters such as repositories and framework integration.                  |
| Presentation   | REST controllers, React components, DTOs, request/response mapping, and UI state. |

Rules:

- Domain code must not depend on NestJS, React, browser APIs, persistence clients, HTTP adapters, or framework decorators.
- Application use cases should depend on interfaces/ports instead of concrete infrastructure.
- Infrastructure should implement application or domain ports.
- Presentation should translate transport-specific input/output into application calls.
- Shared packages should expose stable types and utilities, not service-specific business flows.

## Test-Driven Development

New behavior should be developed test-first where practical.

Expectations:

- Write focused failing tests before implementing domain rules and application use cases.
- Keep domain and application tests fast and independent from infrastructure; use the in-memory fake repository, never a real database.
- Add integration tests when persistence, messaging, filesystem, or HTTP boundaries are introduced. MySQL adapter integration and persistence tests are gated on `OKVNS_TEST_MYSQL_*` env vars and skip when no test database is configured (see `apps/api/test/mysql-test-db.ts`). `docker compose up -d mysql` provisions the `okvns_test` database they expect; point them at it with `OKVNS_TEST_MYSQL_HOST=127.0.0.1 OKVNS_TEST_MYSQL_DATABASE=okvns_test OKVNS_TEST_MYSQL_USER=okvns OKVNS_TEST_MYSQL_PASSWORD=okvns`.
- Do not consider a feature complete if its domain rules, use cases, and API contracts are untested.

## BDD Test Style

Behavior tests should use clear GIVEN-WHEN-THEN wording in test names when it improves readability.

Example:

```text
GIVEN valid YAML WHEN it is imported THEN namespaces are stored
```

Guidelines:

- Use behavior-focused names instead of implementation-focused names.
- Prefer observable outcomes over internal implementation details.
- Keep one main behavior per test.
- Cover success, validation failure, duplicate, not-found, and important edge cases.

## Security Baseline

Security-sensitive implementation work should consider the OWASP Top 10 by default.

Rules for this MVP:

- Validate and normalize all external input at system boundaries.
- Use allowlists for accepted schema keys and resource names.
- Avoid leaking stack traces, filesystem paths, secrets, tokens, or implementation details in API errors.
- Avoid unsafe dynamic execution, prototype pollution, deserialization surprises, and implicit type coercion.
- Apply size limits to request bodies and YAML payloads.
- Log operational events without logging secrets or sensitive personal data.
- Keep dependencies pinned through the workspace lockfile and review security updates regularly.

Authentication and authorization are non-goals for the first implementation. If protected routes are introduced later, authentication and authorization must be designed and specified first.

## Testing Architecture

Testing expectations by layer:

| Layer                             | Target            | Scope                                                                                                                   |
| --------------------------------- | ----------------- | ----------------------------------------------------------------------------------------------------------------------- |
| Domain unit tests                 | 100%              | Entities, value objects, validation rules, invariants, and business errors.                                             |
| Application use case tests        | 100%              | Namespace, entry, import, export, and repository-port orchestration.                                                    |
| YAML unit tests                   | 100%              | Parser, serializer, schema validation, duplicate detection, atomic import input validation, and deterministic export.   |
| API contract tests                | Endpoint coverage | REST request/response contracts, status codes, validation failures, duplicates, not-found cases, and safe error shapes. |
| React component/integration tests | Key flows         | Components, forms, routing, API client mapping, and validation/API error handling.                                      |
| Playwright E2E workflows          | Critical flows    | Namespace CRUD, entry CRUD, YAML import, and YAML export.                                                               |

Coverage rules:

- Domain and application layers must be fully covered because they contain business rules and use cases.
- API contract tests must cover every documented REST endpoint before the endpoint is considered complete.
- React and E2E tests should focus on the highest-risk user workflows.
- A feature should not be considered complete if its domain rules, use cases, or API contracts are missing tests.

## Test Commands

Run all tests:

```bash
pnpm test
```

Run coverage across all packages:

```bash
pnpm test:coverage
```

Run coverage for a single package, for example:

```bash
pnpm --filter @okvns/domain test:coverage
```

Install Playwright browsers once:

```bash
pnpm test:e2e:install
```

Run E2E workflows:

```bash
docker compose up -d mysql
pnpm test:e2e
```

Playwright E2E uses the durable MySQL profile. Starting the Compose `mysql`
service is enough for local E2E because the Playwright web server runs the API
migrations before startup and uses the default local MySQL credentials
(`okvns`/`okvns` on `127.0.0.1:3306`).

Coverage output is written to package or app `coverage/` directories, which are gitignored.
