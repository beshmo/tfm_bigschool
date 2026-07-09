## 1. Shared Contract And Bulk Format Package

- [x] 1.1 Rename shared markdown DTOs and constants to YAML equivalents, including replacing the safe `INVALID_MARKDOWN` error code with `INVALID_YAML`.
- [x] 1.2 Rename the bulk format package and exported parser/serializer APIs from markdown to YAML while preserving package build compatibility in the workspace.
- [x] 1.3 Update YAML parser tests to cover canonical `namespaces`, accepted single `namespace`, strict key allowlisting, duplicate detection, invalid names, non-string values, and payload size limits.
- [x] 1.4 Update YAML serializer tests to assert raw YAML output with canonical `namespaces` shape, deterministic ordering, and no markdown code fence.

## 2. Application Use Cases

- [x] 2.1 Rename import/export use cases from markdown to YAML and update their package imports to the YAML parser/serializer APIs.
- [x] 2.2 Preserve atomic validation-before-mutation and namespace upsert behavior in YAML import use case tests.
- [x] 2.3 Preserve full export and selected namespace export behavior in YAML export use case tests.

## 3. API Contract

- [x] 3.1 Replace `/markdown/import`, `/markdown/export`, and `/markdown/export/:namespace` with `/yaml/import`, `/yaml/export`, and `/yaml/export/:namespace`.
- [x] 3.2 Replace API request and response DTO fields from `markdown` to `yaml`.
- [x] 3.3 Update exception mapping and safe error responses to return `INVALID_YAML` for invalid YAML shapes.
- [x] 3.4 Update API contract tests for successful YAML import, invalid YAML errors, full YAML export, selected YAML export, missing namespace export, and absence of fenced markdown output.

## 4. Admin Frontend

- [x] 4.1 Rename frontend API client methods and mappings from markdown to YAML, including `yaml` JSON fields and `/yaml/*` routes.
- [x] 4.2 Update import page labels, form accessibility names, placeholders, state names, and validation messages to use YAML terminology.
- [x] 4.3 Update export page labels, output textarea label, copy behavior, `.yaml` download filename, and YAML MIME type.
- [x] 4.4 Update React Testing Library tests for YAML import, invalid YAML preservation, full YAML export, and selected namespace YAML export.
- [x] 4.5 Update Playwright workflows to exercise YAML import and YAML export through the browser UI.

## 5. Documentation And Spec Alignment

- [x] 5.1 Update README, API reference, ADR references, and engineering docs from markdown bulk operations to YAML bulk operations.
- [x] 5.2 Document the breaking migration from `/markdown/*` and `markdown` fields to `/yaml/*` and `yaml` fields.
- [x] 5.3 Search the repo for stale markdown bulk-operation terminology and remove or update it where it refers to the replaced public contract.

## 6. Verification

- [x] 6.1 Run package unit tests for shared, domain, application, and YAML bulk format packages.
- [x] 6.2 Run API contract tests.
- [x] 6.3 Run frontend unit tests and Playwright E2E workflows.
- [x] 6.4 Run workspace lint, build, and coverage commands.
