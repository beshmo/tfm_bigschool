# ADR-0005: Use NestJS for the API and React/Vite for the Admin Frontend

## Status

Accepted

## Context

OKVNS needs a REST API with validation, error mapping, health probes, and contract tests. It also needs a browser-based admin UI for namespace and entry management plus YAML import/export.

The frontend stack in the implemented repository is React with Vite, and older Angular wording in planning material is obsolete.

## Decision

Use NestJS for `apps/api` and React with Vite for `apps/admin-web`.

The API exposes REST endpoints for health, readiness, namespace CRUD, entry CRUD, YAML import, and YAML export. The admin frontend consumes those endpoints through an isolated API client layer instead of calling `fetch` directly from components.

## Consequences

- NestJS gives a structured backend module/controller model and predictable testing setup.
- React/Vite provides fast local frontend development and focused component tests.
- API client mapping stays isolated from React components.
- API contract changes must update backend tests, frontend client tests, and documentation together.
