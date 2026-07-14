## 1. Shared and Domain Model

- [x] 1.1 Add `DESCRIPTION_MAX_LENGTH = 1000` and optional `description` fields to shared namespace and entry DTO/input types.
- [x] 1.2 Add domain validation/normalization for optional descriptions, including string type checks, max length, and blank-to-absent normalization.
- [x] 1.3 Extend `Namespace` create, rehydrate, clone, update, and `toDto` behavior to preserve and expose descriptions.
- [x] 1.4 Extend `Entry` create, rehydrate, update, clone-like flows, and `toDto` behavior to preserve and expose descriptions.
- [x] 1.5 Add or update domain tests for valid descriptions, blank normalization, non-string rejection, max-length acceptance, and oversized rejection.

## 2. Application Use Cases

- [x] 2.1 Extend namespace create and update use cases to accept optional descriptions and reject empty update payloads.
- [x] 2.2 Extend entry create and update use cases to accept optional descriptions while preserving existing name/value update behavior.
- [x] 2.3 Update application fake repositories and use case tests to cover description create, update, clear, and DTO mapping.
- [x] 2.4 Verify description-only namespace and entry updates refresh the relevant `modified_at` timestamps.

## 3. Persistence and Migration

- [x] 3.1 Add migration `002_add_descriptions_to_namespaces_and_entries.sql` with nullable description columns for `namespaces` and `entries`.
- [x] 3.2 Update MySQL row types, queries, inserts, upserts, and rehydration to read and write descriptions.
- [x] 3.3 Update MySQL change detection so entry updates compare both `value` and `description`.
- [x] 3.4 Update in-memory repository stamping/change detection to preserve descriptions and refresh timestamps on description changes.
- [x] 3.5 Add or update persistence tests for durable and in-memory description preservation and timestamp behavior.

## 4. API and OpenAPI

- [x] 4.1 Update namespace request DTOs, response schemas, controller calls, and validation tests for optional descriptions.
- [x] 4.2 Update entry request DTOs, response schemas, controller calls, and validation tests for optional descriptions.
- [x] 4.3 Update API contract tests for description create, list, retrieve, update, clear, invalid type, oversized value, and timestamp changes.
- [x] 4.4 Verify generated OpenAPI documents namespace, entry, and YAML description fields and constraints.

## 5. YAML Import and Export

- [x] 5.1 Update YAML parsed types and parser allowlists to accept optional namespace and entry descriptions.
- [x] 5.2 Validate imported descriptions as strings no longer than 1000 characters and normalize blanks to absent.
- [x] 5.3 Update YAML import use case to build namespace and entry aggregates with parsed descriptions.
- [x] 5.4 Update YAML serializer to emit `description` only when a namespace or entry has one.
- [x] 5.5 Add parser/serializer/use-case tests for valid descriptions, invalid descriptions, blank descriptions, and deterministic export.

## 6. Admin Frontend

- [x] 6.1 Extend the frontend API port, HTTP client, fake API, and tests to send and preserve descriptions.
- [x] 6.2 Add namespace create and detail edit controls for optional descriptions with validation error display.
- [x] 6.3 Add entry create and edit controls for optional descriptions while preserving existing value-edit behavior.
- [x] 6.4 Display namespace and entry descriptions in list/detail contexts when present.
- [x] 6.5 Update React Testing Library coverage for create, update, clear, and display description workflows.

## 7. E2E and Documentation

- [x] 7.1 Update Playwright namespace CRUD workflow to exercise namespace descriptions.
- [x] 7.2 Update Playwright entry CRUD workflow to exercise entry descriptions.
- [x] 7.3 Update YAML import/export E2E fixtures or assertions to cover descriptions.
- [x] 7.4 Update project API/YAML documentation to describe optional descriptions and the 1000-character limit.
- [x] 7.5 Run `pnpm lint`, `pnpm test`, `pnpm typecheck`, and relevant Playwright workflows; fix regressions.
