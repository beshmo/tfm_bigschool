## Context

OKVNS already exposes a stable REST endpoint for reading an entry at `GET /namespaces/:namespace/entries/:name`. The admin frontend has an internal `HttpOkvnsApi`, but that client is scoped to UI workflows, browser configuration, and the full admin API surface.

External applications that run their own OKVNS API need a smaller package that can be consumed directly from TypeScript without bringing in NestJS, React, persistence adapters, or admin frontend concerns.

## Goals / Non-Goals

**Goals:**

- Add a framework-independent package for reading OKVNS entry values from an already-running API.
- Provide a small `OkvnsWrapper` class with `read(namespace, entry, defaultValue): Promise<string>`.
- Treat missing namespace and missing entry API responses as configuration misses and return `defaultValue`.
- Keep transport failures and unexpected API responses visible through typed errors.
- Make the package usable in Node.js and browser runtimes that provide `fetch`, with dependency injection for tests and custom runtimes.

**Non-Goals:**

- Do not add authentication, authorization, API key handling, retries, caching, or batching.
- Do not change the OKVNS REST API contract.
- Do not add write, list, YAML import, or YAML export operations to the wrapper.
- Do not make the wrapper depend on NestJS, React, MySQL, or application use cases.

## Decisions

### Create a dedicated `packages/okvns-wrapper` package

The wrapper will live in its own package rather than inside `packages/shared` or `apps/admin-web`.

Rationale: `packages/shared` is reserved for stable transport-facing types and utilities, not business flows or HTTP clients. The admin web client already maps the full API for UI state, but external applications need a narrow package with its own public API and tests.

Alternatives considered:

- Reuse `HttpOkvnsApi` directly: rejected because it is frontend-owned and exposes more behavior than this wrapper needs.
- Add the wrapper to `packages/shared`: rejected because the shared package should not own service-specific HTTP flows.

### Use asynchronous reads

`OkvnsWrapper.read` will return `Promise<string>`.

Rationale: the wrapper performs an HTTP request, so a synchronous `string` return would hide asynchronous transport behavior or require an implicit cache that is outside this change.

Alternatives considered:

- Expose `read(...): string`: rejected because it would be misleading for a network-bound operation.
- Add a preload/cache API: rejected as unnecessary for the first wrapper use case.

### Default only on not-found responses

The wrapper will return `defaultValue` only when the API response clearly represents a missing namespace or missing entry, using either the safe API error code or the `404` status where the error body is unavailable.

Rationale: callers want configuration-style fallback behavior for missing keys, but transport failures, validation errors, server errors, and malformed success responses should not be silently masked as default values.

Alternatives considered:

- Return `defaultValue` for any failed request: rejected because it hides outages and invalid configuration.
- Throw on all `404` responses: rejected because the agreed wrapper contract is default-on-404.

### Keep HTTP mapping small and portable

The wrapper will accept a `baseUrl` option and an optional `fetch` implementation. It will normalize trailing slashes, encode namespace and entry path segments, parse the expected `EntryDto` response, and expose a typed wrapper error for non-default failures.

Rationale: injecting fetch keeps tests deterministic and allows consumers to provide runtime-specific behavior without adding an HTTP client dependency.

Alternatives considered:

- Add a dependency such as Axios: rejected because built-in `fetch` is sufficient for one GET endpoint and avoids extra runtime weight.
- Read `OKVNS_API_BASE_URL` from environment variables: rejected because external apps should pass explicit configuration and environment access differs between Node.js and browsers.

## Risks / Trade-offs

- Missing-resource detection could be too broad if any `404` is treated as a default value. Mitigation: build the request path internally, prefer known `NAMESPACE_NOT_FOUND` and `ENTRY_NOT_FOUND` codes, and only fall back to status `404` for malformed not-found bodies.
- The first wrapper is intentionally narrow and may prompt requests for writes or batch reads. Mitigation: keep this package extensible but do not add unneeded API surface until concrete use cases exist.
- Browser consumers may hit CORS restrictions from their OKVNS stack. Mitigation: document that the wrapper uses the existing API and depends on that stack's CORS configuration.
- Node.js consumers need a runtime with `fetch` or must inject one. Mitigation: align with the repo's Node.js 22 baseline, where global fetch is available.

## Migration Plan

This is additive. Implement the new package, include it in workspace build/test/typecheck flows, and document basic usage. Existing apps and packages continue to work unchanged.

Rollback is removing the new package and its references from workspace scripts or documentation; no data migration or API deployment change is required.

## Open Questions

- Should the package be published externally later under `@okvns/wrapper`, or remain workspace-private for the TFM deliverable?
- Should a future change add optional timeout/retry support once a real external app integration needs it?
