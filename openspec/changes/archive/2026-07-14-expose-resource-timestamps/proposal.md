## Why

Operators need to see when namespaces and entries were created and last changed so they can audit configuration drift from both the API and the admin frontend. MySQL already stores this metadata, but the domain model, service responses, and UI currently discard it.

## What Changes

- Expose `created_at` and `modified_at` on namespace and entry models returned by API list and retrieval operations.
- Define `modified_at` for namespaces as the last namespace-level change or entry mutation, so admin users can see when anything inside a namespace last changed.
- Map MySQL `updated_at` to public `modified_at` while keeping existing database column names.
- Stamp equivalent timestamps in the in-memory repository during create, save, rename, import, and entry mutation operations so the memory profile follows the same response contract.
- Export namespace and entry metadata in YAML export operations.
- Accept optional `created_at` and `modified_at` metadata in YAML import documents, but ignore those metadata values and stamp imported resources according to storage write semantics.
- Show namespace and entry timestamps in the React admin frontend list/detail workflows.
- Update OpenAPI documentation and tests for timestamp fields.

## Capabilities

### New Capabilities

- None.

### Modified Capabilities

- `namespace-management`: Namespace responses include `created_at` and aggregate `modified_at` metadata for list, create, retrieve, rename, import/save-backed operations, and entry mutations.
- `entry-management`: Entry responses include `created_at` and `modified_at` metadata for list, create, retrieve, and update operations.
- `markdown-bulk-operations`: YAML export emits namespace and entry timestamp metadata; YAML import accepts but ignores optional timestamp metadata.
- `admin-frontend`: Admin namespace and entry screens display timestamp metadata returned by the API.
- `api-documentation`: OpenAPI schemas document timestamp fields on namespace, entry, and YAML import/export responses.

## Impact

- Affected packages: `packages/shared`, `packages/domain`, `packages/application`.
- Affected YAML code: parser and serializer behavior, YAML use cases, API contract tests.
- Affected API code: namespace and entry response schemas/controllers, YAML schemas/controllers, MySQL and in-memory namespace repositories, API contract tests.
- Affected frontend code: admin API types/tests and namespace/entry list/detail page rendering.
- Affected storage: no migration is expected for MySQL because `created_at` and `updated_at` already exist on `namespaces` and `entries`.
