## Context

OKVNS currently models namespaces as named aggregates that own named string-value entries. Both resources carry `created_at` and `modified_at` lifecycle metadata, and MySQL is the default durable source of truth with an in-memory profile for tests and demos. YAML import/export already carries timestamp metadata on export and accepts timestamp metadata on import while ignoring it.

The new `description` field is user-authored documentation metadata, not lifecycle metadata. It needs to flow through the same clean architecture boundaries as names and values: domain validation, application use cases, transport DTOs, persistence adapters, YAML, and React admin views.

## Goals / Non-Goals

**Goals:**

- Add optional namespace and entry descriptions with a 1000-character limit.
- Preserve descriptions in MySQL and in-memory storage.
- Include descriptions in API response DTOs, OpenAPI documentation, and frontend API mapping.
- Let admin users create, view, and update descriptions for namespaces and entries.
- Support descriptions in YAML import/export while preserving atomic validation-before-mutation behavior.
- Refresh `modified_at` when a stored description changes.

**Non-Goals:**

- No rich text, markdown rendering, localization, or formatting semantics for descriptions.
- No full-text search or filtering by description.
- No authentication, authorization, or audit trail for description changes.
- No attempt to import or preserve timestamp metadata from YAML; timestamps remain target-store lifecycle metadata.

## Decisions

### Use an optional normalized string field

Descriptions will be represented as `description?: string` in shared DTOs and domain objects. Input normalization will trim strings and convert blank or whitespace-only descriptions to `undefined`.

Alternatives considered:

- Store blank strings as provided: preserves raw input but creates noisy metadata that is indistinguishable from a missing useful description.
- Require descriptions on create: conflicts with the documentation-only purpose and would add friction to existing workflows.

### Validate descriptions in shared/domain boundaries

`DESCRIPTION_MAX_LENGTH = 1000` will live in `@okvns/shared`, and domain constructors/update methods will enforce string-or-absent and max length. API DTOs and YAML parser validation will mirror that limit at the boundary so users receive clear validation errors before persistence.

Alternatives considered:

- Validate only in API DTOs: misses YAML/package-level paths and weakens domain invariants.
- Validate only in domain: keeps invariants but pushes less helpful errors to transport callers.

### Extend existing create/update flows

Namespace creation will accept optional `description`. Namespace update will become a partial update of name and/or description while preserving rename semantics and duplicate-name protection. Entry creation/update will accept optional `description` alongside existing name and value fields.

Alternatives considered:

- Add separate description-only endpoints: more endpoints and frontend calls for a small metadata field.
- Keep namespace update as rename-only and add description through YAML only: inconsistent with the admin and API management model.

### Add a forward migration

Existing MySQL setup will keep `001_create_namespaces_and_entries.sql` as the initial schema and add a new `002_add_descriptions_to_namespaces_and_entries.sql` migration. The columns should be nullable to preserve existing rows.

Alternatives considered:

- Edit only migration `001`: works for empty databases but does not upgrade already-migrated local or deployed databases.
- Use a side metadata table: unnecessary complexity for a single bounded field tied directly to each resource.

### Include descriptions in YAML snapshots

YAML import will allow `description` on namespace and entry objects and persist it after validation. YAML export will emit `description` when present. `created_at` and `modified_at` remain accepted-but-ignored on import.

Alternatives considered:

- Ignore YAML descriptions like timestamps: wrong semantics because descriptions are user-authored resource data.
- Always export `description: ""`: creates noisy output and conflicts with blank normalization.

## Risks / Trade-offs

- [Risk] Namespace update expands from rename-only to partial update, which can accidentally allow empty bodies if not validated. → Mitigation: reject updates that contain neither a name nor a description field, and cover this in contract tests.
- [Risk] MySQL row comparison currently detects entry changes by value only. → Mitigation: compare both `value` and normalized `description` when deciding whether to update an entry and refresh timestamps.
- [Risk] YAML strict-key validation can reject valid new documents if allowlists are incomplete. → Mitigation: update namespace and entry allowlists together with parser tests for valid and invalid descriptions.
- [Risk] Frontend forms can become cluttered. → Mitigation: use compact optional text areas near existing name/value controls and display descriptions only when present.

## Migration Plan

1. Add nullable `description` columns to `namespaces` and `entries` in migration `002_add_descriptions_to_namespaces_and_entries.sql`.
2. Deploy code that can read and write the new nullable columns after migrations run.
3. Existing rows will surface with no description.
4. Rollback of application code is safe while columns remain present; rollback of the database column is not required for application rollback and should be avoided unless data loss is explicitly accepted.

## Open Questions

None. The agreed behavior is optional string descriptions, maximum length 1000 characters, blank normalization to absent, persisted through model/service/frontend, and description changes updating modification timestamps.
