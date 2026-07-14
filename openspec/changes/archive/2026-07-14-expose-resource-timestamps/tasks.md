## 1. Shared and Domain Model

- [x] 1.1 Add `created_at` and `modified_at` string fields to `EntryDto` and `NamespaceDto` in `packages/shared`.
- [x] 1.2 Extend `Entry` with timestamp metadata, DTO serialization, and a repository rehydration helper that preserves stored timestamps.
- [x] 1.3 Extend `Namespace` with timestamp metadata, DTO serialization, rename metadata behavior, and a repository rehydration helper that preserves stored timestamps and entries.
- [x] 1.4 Update domain tests to cover timestamp serialization, stable creation timestamps, and modified timestamp changes for namespace rename and entry update.

## 2. Application and Repository Behavior

- [x] 2.1 Update application use case tests for namespace and entry DTOs with timestamp fields.
- [x] 2.2 Update the in-memory namespace repository to stamp current timestamps during create, save, rename, import, and entry mutation operations while preserving existing `created_at` values.
- [x] 2.3 Update the MySQL namespace repository reads to select namespace and entry `created_at` plus `updated_at` mapped to `modified_at`.
- [x] 2.4 Update the MySQL namespace repository save/upsert behavior so entry `created_at` remains stable across logical entry updates and entry `modified_at` changes only for changed entries.
- [x] 2.5 Add repository tests proving namespace `modified_at` changes for entry create/update/delete operations.

## 3. API Contract and Documentation

- [x] 3.1 Update namespace and entry OpenAPI response schemas to document `created_at` and `modified_at` as date-time strings.
- [x] 3.2 Update YAML parser and serializer schemas so export emits namespace and entry timestamps and import accepts but ignores optional timestamp metadata.
- [x] 3.3 Update API contract tests for namespace create/list/get/rename and entry create/list/get/update timestamp fields.
- [x] 3.4 Update YAML import/export contract tests to prove export includes metadata and import ignores supplied metadata.
- [x] 3.5 Update OpenAPI document tests to assert timestamp fields are present on namespace, entry, and YAML schemas.

## 4. Admin Frontend

- [x] 4.1 Update admin API tests and fake API fixtures to include namespace and entry timestamp fields.
- [x] 4.2 Display namespace `created_at` and `modified_at` in namespace list and detail workflows.
- [x] 4.3 Display entry `created_at` and `modified_at` in namespace detail entry workflows.
- [x] 4.4 Update React Testing Library coverage for timestamp rendering.

## 5. Verification

- [x] 5.1 Run package/domain/application/API/admin tests affected by timestamp DTO changes.
- [x] 5.2 Run `pnpm lint`, `pnpm typecheck`, and `pnpm build`.
- [x] 5.3 Run `openspec validate expose-resource-timestamps`.
