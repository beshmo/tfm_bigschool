## Why

Namespaces and entries currently store names, values, and lifecycle timestamps, but they do not provide a first-class place for human-facing documentation. Admin users need short descriptions to explain what a namespace or entry represents without overloading names or entry values.

## What Changes

- Add an optional `description` string field to namespaces and entries.
- Limit descriptions to 1000 characters and reject non-string or oversized descriptions at API and YAML boundaries.
- Normalize blank or whitespace-only descriptions to an absent value instead of storing meaningless text.
- Persist descriptions in both MySQL and in-memory storage profiles.
- Include descriptions in namespace and entry DTOs, OpenAPI schemas, YAML import/export, and frontend API mapping.
- Let admin users create, view, and update namespace and entry descriptions in the React admin frontend.
- Treat description changes as modifications that refresh the affected resource `modified_at` timestamp, and for entry description changes also refresh the owning namespace aggregate `modified_at`.

## Capabilities

### New Capabilities

None.

### Modified Capabilities

- `namespace-management`: Namespace create, list, retrieve, and update behavior includes optional descriptions.
- `entry-management`: Entry create, list, retrieve, and update behavior includes optional descriptions.
- `markdown-bulk-operations`: YAML import/export accepts and emits namespace and entry descriptions.
- `admin-frontend`: Admin UI exposes description create, view, and update workflows for namespaces and entries.
- `api-documentation`: OpenAPI documentation describes description request and response fields.
- `persistent-storage`: Durable and in-memory storage preserve optional descriptions and migrate existing data.

## Impact

- Shared DTOs and constants in `packages/shared`.
- Domain aggregates/entities in `packages/domain`.
- Application use cases and ports in `packages/application`.
- YAML parser and serializer in `packages/yaml`.
- NestJS DTOs, OpenAPI schemas, controllers, contract tests, and persistence adapters in `apps/api`.
- MySQL schema migrations under `apps/api/migrations`.
- React admin API client, fake API, pages, component tests, and E2E workflows in `apps/admin-web` and `e2e`.
