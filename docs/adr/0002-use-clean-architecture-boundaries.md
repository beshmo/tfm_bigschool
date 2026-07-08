# ADR-0002: Use Clean Architecture Boundaries

## Status

Accepted

## Context

The core OKVNS behavior is small but must remain independent from framework and deployment concerns. Namespace rules, entry rules, markdown behavior, and use-case orchestration should be testable without starting NestJS, React, browsers, containers, or persistence adapters.

## Decision

Use clean architecture boundaries.

Dependency direction is:

1. Domain contains business rules and imports no framework, transport, UI, browser, or persistence implementation.
2. Application orchestrates use cases and depends on ports/interfaces.
3. Infrastructure implements application ports.
4. Presentation maps HTTP and UI concerns to application calls.

## Consequences

- Domain and application behavior can be tested quickly and deterministically.
- Persistence can be replaced later without rewriting use cases.
- Controllers and React components stay focused on transport and UI mapping.
- Additional abstractions must remain justified by a real boundary or testability need.

