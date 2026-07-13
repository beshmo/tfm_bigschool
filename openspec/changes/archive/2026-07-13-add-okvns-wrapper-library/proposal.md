## Why

External applications that already operate their own OKVNS stack need a small TypeScript client for reading configuration-style values without depending on the admin frontend or reimplementing URL and error handling.

This is useful now because the REST entry retrieval endpoint is stable, documented, and backed by durable storage, making it safe to expose a narrow consumer-facing wrapper around `GET /namespaces/:name/entries/:entry`.

## What Changes

- Add a new framework-independent TypeScript package for external OKVNS consumers.
- Expose an `OkvnsWrapper` class with a `read(namespace, entry, defaultValue)` method.
- Make `read` call an already-running OKVNS API and return the entry value when found.
- Return the caller-provided default value when the API reports a missing namespace or missing entry.
- Surface network failures, validation errors, server errors, malformed responses, and other unexpected failures as typed wrapper errors.
- Add focused unit tests and package build/typecheck wiring for the new wrapper package.

## Capabilities

### New Capabilities

- `okvns-wrapper-library`: TypeScript client wrapper for external applications that read entry values from an existing OKVNS API stack.

### Modified Capabilities

- None.

## Impact

- Adds `packages/okvns-wrapper` to the pnpm workspace.
- Adds package-level source, tests, TypeScript configuration, and package scripts.
- May update root build, typecheck, lint, test, and coverage behavior only insofar as the new package is included by existing workspace globs.
- Does not change API routes, storage behavior, admin frontend behavior, authentication, deployment topology, or existing REST response contracts.
