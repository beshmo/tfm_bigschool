## Why

Entries can contain values that are valid only for a specific deployment environment. When namespaces are exported from one environment and imported into another, admin users need a reliable way to identify entries that require review and adjustment.

## What Changes

- Add an `env_dependent` boolean metadata property to entries.
- Default `env_dependent` to `false` when omitted from API requests, YAML imports, or existing stored data.
- Allow admin users and API clients to set, update, view, and clear the entry `env_dependent` flag.
- Include `env_dependent` for every entry in YAML export output, including entries where the value is `false`.
- Accept `env_dependent` during YAML import only when it is a boolean and persist it with the entry.
- Surface `env_dependent` in the admin frontend so flagged entries can be located and modified after cross-environment imports.

## Capabilities

### New Capabilities

- None.

### Modified Capabilities

- `entry-management`: Entry CRUD now includes the `env_dependent` boolean metadata property.
- `markdown-bulk-operations`: YAML import/export now preserves entry `env_dependent` metadata and emits it for all exported entries.
- `admin-frontend`: The admin UI now supports viewing, editing, and locating environment-dependent entries.
- `persistent-storage`: Durable storage now persists entry `env_dependent` metadata with a default of `false`.
- `api-documentation`: OpenAPI documentation now describes the entry `env_dependent` field in request and response contracts.

## Impact

- Domain/shared entry DTOs and entry input contracts.
- Application entry create/update use cases and YAML import/export use cases.
- In-memory and MySQL namespace repositories plus a new MySQL migration.
- Entry REST DTO validation, response schemas, and OpenAPI metadata.
- YAML parser and serializer behavior.
- Admin frontend API mapping, entry forms, listing display, and tests.
- Unit, contract, integration, and frontend test coverage for defaulting, persistence, validation, and export behavior.
