## Context

The current bulk import/export capability is named and documented as markdown, but its parser already validates YAML and its serializer emits YAML wrapped in a markdown code fence. The API exposes `/markdown/*` routes with `markdown` JSON fields, shared DTOs use markdown naming, frontend screens say markdown, and exported downloads use `.md` with `text/markdown`.

This change makes YAML the explicit public contract. The replacement is intentionally breaking: no compatibility routes, no dual request fields, and no fenced markdown export output.

## Goals / Non-Goals

**Goals:**

- Replace the public bulk import/export API contract with YAML routes and YAML JSON fields.
- Export raw YAML using the canonical `namespaces: [...]` shape and deterministic ordering.
- Keep existing validation and application semantics: strict schema allowlisting, full-document validation before mutation, duplicate detection, namespace upsert, selected namespace export, and safe errors.
- Rename public and architectural symbols from markdown to YAML where they would otherwise leak the removed contract.
- Update the admin frontend so users paste, copy, and download YAML instead of markdown.
- Update specs, docs, tests, and examples to describe YAML consistently.

**Non-Goals:**

- No backward-compatible `/markdown/*` endpoints or legacy `markdown` request/response fields.
- No support for additional import/export formats beyond YAML.
- No persistence, authentication, authorization, or deployment behavior changes.
- No schema redesign beyond removing markdown wrapping and terminology.
- No removal of the accepted single `namespace: ...` import shape; that compatibility is part of the OKVNS YAML schema, not the markdown transport.

## Decisions

### Use a direct breaking API replacement

The API will expose `/yaml/import`, `/yaml/export`, and `/yaml/export/:namespace`. Request and response bodies will use `yaml` fields.

Alternatives considered:

- Keep `/markdown/*` and only change output: rejected because it preserves the confusing public contract.
- Add `/yaml/*` while keeping `/markdown/*`: rejected because there are no known external clients and the requested direction is a clean breaking replacement.

### Export raw YAML, not fenced YAML

The YAML exporter will return a plain YAML document. It will not wrap the output in triple-backtick fences.

Alternatives considered:

- Continue accepting and emitting markdown fences: rejected for export because the new contract is raw YAML.
- Accept fenced input for convenience: rejected for the strict replacement unless implementation discovers a documented internal need; the YAML importer should validate YAML directly.

### Rename format-facing code to YAML

Types, use cases, controller names, frontend API methods, tests, docs, and error terminology should be renamed from markdown to YAML where those names describe the bulk format contract. This includes replacing `INVALID_MARKDOWN` with `INVALID_YAML` as the safe error code.

Alternatives considered:

- Keep `@okvns/markdown` internally because it already parses YAML: rejected because package and symbol names would keep encoding the obsolete contract.
- Use generic names such as `bulk-format`: rejected because YAML is the only supported format and explicit names are clearer.

### Preserve OKVNS YAML schema semantics

The canonical export shape remains `namespaces: [...]`. Import continues to accept the single `namespace: ...` shape, validates the complete document before storage writes, rejects unexpected keys and duplicates, and upserts each imported namespace by name.

Alternatives considered:

- Remove `namespace: ...` during the breaking migration: rejected because the requested break is markdown-to-YAML, and removing the single namespace shape would be a separate schema compatibility decision.

## Risks / Trade-offs

- Existing markdown clients will fail after deployment -> Mitigation: document the breaking route, field, error code, and file output changes clearly in specs and reference docs.
- Renaming package and symbols can cause missed imports or stale docs -> Mitigation: use repo-wide searches for markdown terminology and verify build, unit, contract, and E2E tests.
- Error code changes may affect client assertions -> Mitigation: update shared error constants, API mappings, frontend error tests, and docs together.
- Raw YAML output may surprise users accustomed to fenced blocks -> Mitigation: update frontend labels, textarea labels, placeholder examples, download extension, and reference examples.

## Migration Plan

1. Update specs and docs to define YAML as the sole bulk format contract.
2. Rename the bulk format package and exported parser/serializer APIs from markdown to YAML.
3. Update shared DTOs and safe error code terminology.
4. Replace API controller routes, DTOs, providers, and contract tests with YAML equivalents.
5. Update application use cases to depend on YAML parser/serializer names.
6. Update admin frontend API client, import/export screens, tests, and E2E workflows.
7. Run package tests, API contract tests, frontend tests, E2E tests, lint, and build.

Rollback would require restoring the previous markdown routes, DTO fields, fenced serializer output, and frontend markdown UI. Because this is an intentional breaking replacement, rollback is source-level rather than runtime-compatible.

## Open Questions

- None.
