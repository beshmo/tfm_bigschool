## Context

Entries currently carry a validated name, string value, optional description, and timestamp metadata across the domain model, API DTOs, repositories, YAML import/export, and admin frontend. YAML export is used to move namespaces between environments, but the exported data does not identify entries whose values require environment-specific adjustment after import.

## Goals / Non-Goals

**Goals:**

- Add `env_dependent` as stable entry metadata across API, storage, YAML, and frontend boundaries.
- Default omitted `env_dependent` values to `false` for backwards-compatible API requests, YAML imports, and existing database rows.
- Emit `env_dependent` for every exported YAML entry, including `false`, so exported files are easy to audit.
- Let admin users locate and modify environment-dependent entries after importing data from another environment.

**Non-Goals:**

- Automatically rewrite environment-dependent values during import or export.
- Add environment profiles, variable substitution, secrets handling, or validation against target environment configuration.
- Add namespace-level environment-dependency metadata.
- Treat `env_dependent` as authorization-sensitive or hide values from the existing admin UI.

## Decisions

### Store `env_dependent` as entry metadata

The flag belongs to the entry alongside description and timestamps. It is not part of the value string and should not require parsing value content. This keeps CRUD, YAML, and frontend behavior consistent and avoids creating a separate tagging model for a single boolean concern.

Alternative considered: infer environment dependence from descriptions or naming conventions. That would be brittle, hard to validate, and would not give API clients a reliable contract.

### Use `env_dependent` at external boundaries and `envDependent` internally

API and YAML contracts will expose the snake_case `env_dependent` property, matching existing external fields such as `created_at` and `modified_at`. TypeScript internals may use `envDependent` where that matches local style, but mapping must stay isolated at DTO/YAML boundaries.

Alternative considered: expose camelCase externally. That would be inconsistent with the existing public contract.

### Default omitted values to `false`

Create requests, update requests, YAML imports, and existing storage rows must treat an omitted flag as `false`. This preserves existing clients and historical data while making the property non-nullable in responses and exports.

Alternative considered: make the property optional everywhere. That would force every consumer to distinguish missing from false even though the domain only needs a binary marker.

### Always emit `env_dependent` in YAML exports

YAML export must include `env_dependent` on every entry. This makes exported files self-documenting and allows admin users to search or filter exported YAML consistently after cross-environment transfer.

Alternative considered: emit only when true. That is more compact, but it makes absent values ambiguous and weakens the export as an audit artifact.

### Persist as a non-null MySQL boolean with default false

MySQL storage should add a non-null boolean-compatible column to entries with a default of false. Existing rows are upgraded in place with false, and repositories hydrate the field into entry DTOs.

Alternative considered: nullable column. This would preserve historical absence but complicates repository mapping and violates the default-false contract.

## Risks / Trade-offs

- [Risk] Existing clients may ignore the new response field safely, but strict client-side schema validators may need updates. → Mitigation: treat this as an additive response change and document the field in OpenAPI.
- [Risk] YAML imports from hand-edited files may use strings such as `"true"`. → Mitigation: reject non-boolean `env_dependent` values with the existing invalid YAML flow.
- [Risk] Admin users still need to decide how to adjust flagged values after import. → Mitigation: provide clear UI visibility and filtering, but leave value changes under explicit admin control.
- [Risk] Migration must not rewrite or drop entry values. → Mitigation: add only a defaulted metadata column and cover existing-row behavior in migration/integration tests.

## Migration Plan

1. Add a repeatable MySQL migration that adds `entries.env_dependent` with default false and backfills existing rows through the column default.
2. Update domain/shared/application contracts to carry the flag.
3. Update in-memory and MySQL repositories to preserve the flag.
4. Update REST DTO validation and OpenAPI schemas.
5. Update YAML parser and serializer.
6. Update the admin frontend create/edit forms, display, filtering, and API mapping.
7. Verify package tests, API contract tests, MySQL repository tests, and frontend tests.

Rollback is data-compatible: the feature can be disabled at the application layer while the extra database column remains unused. Dropping the column would lose only the metadata flag, not entry values.

## Open Questions

- None.
