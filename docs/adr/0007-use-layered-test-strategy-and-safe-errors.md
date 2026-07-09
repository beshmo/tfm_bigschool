# ADR-0007: Use a Layered Test Strategy and Safe API Errors

## Status

Accepted

## Context

OKVNS has business invariants, use-case orchestration, strict YAML validation, REST contracts, React workflows, and browser E2E flows. Failures at each layer should be caught close to the source.

The API also handles untrusted input and must avoid exposing implementation details.

## Decision

Use a layered test strategy with safe API error responses.

Testing expectations are:

- Domain, application, and YAML packages have focused Vitest coverage, with domain and application targeting full coverage.
- API contract tests cover documented endpoints, status codes, validation failures, duplicates, not-found cases, and safe error shapes.
- React tests cover key component flows, routing, API client mapping, and validation/API error handling.
- Playwright tests cover critical browser workflows.

API errors use a safe response shape:

```json
{ "error": { "code": "ERROR_CODE", "message": "...", "details": ["..."] } }
```

## Consequences

- Core behavior can be verified without infrastructure.
- HTTP and browser behavior are covered at their boundaries.
- Stack traces, filesystem paths, secrets, tokens, and implementation details must not leak through API responses.
- Future features should add tests at the layer where the risk is introduced.
