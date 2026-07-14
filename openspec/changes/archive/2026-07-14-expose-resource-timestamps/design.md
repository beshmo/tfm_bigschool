## Context

OKVNS already persists timestamp metadata in MySQL for both `namespaces` and `entries` using `created_at` and `updated_at` columns. The current domain entities, shared DTOs, API response schemas, use cases, and admin frontend only expose names, values, and entry collections, so clients cannot inspect creation or modification metadata.

The default durable runtime is MySQL. The in-memory repository remains supported for tests and local demos, so it must emit the same timestamp fields even though it has no database-managed defaults.

## Goals / Non-Goals

**Goals:**

- Expose `created_at` and `modified_at` on namespace and entry API response bodies.
- Preserve deterministic list/find behavior while adding timestamp fields.
- Define namespace `modified_at` as aggregate freshness: the last namespace-level change or entry mutation inside the namespace.
- Use the existing MySQL timestamp columns and map `updated_at` to public `modified_at`.
- Stamp timestamps in the in-memory repository for create, save, rename, import, and entry mutation flows.
- Include namespace and entry metadata in YAML export output.
- Accept optional namespace and entry metadata in YAML import input while ignoring imported metadata values.
- Display namespace and entry timestamps in the admin frontend list/detail views.

**Non-Goals:**

- No authentication, authorization, audit actor, or event history.
- No MySQL migration for timestamp columns, because the initial migration already creates them.
- No detailed audit history of which entry changed or who changed it.

## Decisions

### Public Field Names

Expose `created_at` and `modified_at` in shared DTOs and API responses.

Rationale: the requested contract uses these names, and `modified_at` is clearer for API clients than leaking MySQL's `updated_at` column name. The database can keep `updated_at`; repositories own the mapping.

Alternative considered: expose `updated_at` directly. Rejected because it couples the transport contract to the current MySQL column name and conflicts with the requested field name.

### Timestamp Representation

Represent timestamps as ISO 8601 strings in domain DTOs and API responses.

Rationale: JSON has no native date type, OpenAPI documents date-time strings cleanly, and the frontend can render strings without transport-specific parsing assumptions. Repository adapters should normalize database `Date` values to ISO strings before constructing domain objects.

Alternative considered: keep JavaScript `Date` objects in shared DTOs. Rejected because DTOs are transport-facing and should reflect serialized JSON.

### Domain Metadata Ownership

Add timestamp metadata to `Namespace` and `Entry` entities with creation helpers for new objects and rehydration helpers for repository-loaded objects.

Rationale: use cases already return `namespace.toDto()` and `entry.toDto()`. Keeping timestamp fields in the domain entities prevents every use case or controller from needing metadata-specific mapping. Rehydration helpers let repositories preserve stored timestamps without bypassing resource-name and value validation.

Alternative considered: keep timestamps only in repository-specific response mappers. Rejected because the application port returns domain aggregates and current DTO mapping is owned by entities.

### Namespace `modified_at` Semantics

Namespace `modified_at` SHALL represent aggregate freshness for the namespace. Namespace create, rename, repository save/upsert, import replacement, and entry create/update/delete operations SHALL change namespace `modified_at`.

Rationale: admin users benefit from seeing when anything inside a namespace last changed directly from namespace list and detail views. This makes `modified_at` useful as a coarse operational freshness signal without requiring users to inspect every entry.

Trade-off: `modified_at` no longer distinguishes whether the namespace row changed or an entry changed. That distinction remains out of scope unless a future audit/event capability is added.

### YAML Metadata Semantics

YAML export SHALL include `created_at` and `modified_at` on namespace objects and entry objects. YAML import SHALL allow those keys on namespace and entry objects, but SHALL ignore their values and use storage-assigned timestamps for created or replaced resources.

Rationale: exported YAML becomes a fuller snapshot for operators, while imports remain safe and authoritative to the target environment. Ignoring imported metadata avoids allowing clients to forge audit-like timestamps or carry stale timestamps across environments.

Alternative considered: reject timestamp keys during import. Rejected because YAML exported by the system should be import-compatible without manual metadata removal.

Alternative considered: preserve imported timestamp values. Rejected because timestamp metadata describes the target store lifecycle, not the source file lifecycle.

### Repository Stamping

MySQL should read `created_at` and `updated_at AS modified_at` from both tables. It should continue relying on existing MySQL defaults for new rows and `ON UPDATE CURRENT_TIMESTAMP` for row-level updates. Entry mutations should also touch the owning namespace row inside the same transaction so the namespace `updated_at` value reflects aggregate freshness.

The in-memory repository should apply a single current timestamp value per write operation. It should preserve `created_at` for existing namespaces and entries where possible, refresh changed entry `modified_at`, and refresh namespace `modified_at` whenever the namespace itself or any contained entry changes.

Rationale: the memory profile should behave like the durable profile from the API user's perspective, without adding a separate clock dependency unless tests need deterministic injection.

Alternative considered: stamp timestamps in application use cases. Rejected because timestamp assignment is storage lifecycle metadata, and MySQL already owns it in durable mode.

### Entry Persistence Caveat

The current MySQL `save(namespace)` implementation replaces all entries for a namespace by deleting and reinserting them. Implementation should avoid treating the current deletion/reinsert behavior as the intended timestamp contract. If preserving entry `created_at` across value updates is required, the adapter should update existing rows and insert/delete the difference instead of wholesale replacement.

Rationale: clients expect `created_at` to be stable for a logical entry. Deleting and reinserting would make entry creation metadata misleading after updates or namespace saves.

## Risks / Trade-offs

- Entry `created_at` may reset if MySQL continues wholesale delete/reinsert during save -> update the MySQL save path to preserve existing entry rows where needed, or add tests that expose this behavior before implementation is accepted.
- Namespace `modified_at` might fail to change during entry mutations if implementation only touches entry rows -> update the namespace row or aggregate metadata in the same transaction and add API/repository tests for changed namespace `modified_at`.
- In-memory timestamps can be flaky in tests if assertions depend on wall-clock equality -> assert parseability and ordering, or inject a deterministic clock if local patterns support it.
- Existing tests that assert exact DTO equality will fail once timestamp fields are added -> update them to assert required fields explicitly or use object matchers.
- Exported YAML that includes metadata is more verbose and import accepts ignored metadata -> document that metadata is informational on import and add tests proving imported metadata does not override storage-assigned timestamps.
