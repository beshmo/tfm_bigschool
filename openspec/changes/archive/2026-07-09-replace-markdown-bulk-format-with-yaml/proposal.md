## Why

Bulk import/export currently exposes a markdown contract even though the accepted content is YAML and the exporter emits a fenced YAML block. Using raw YAML as the public contract removes this mismatch and gives API and frontend users a clearer file format for OKVNS data exchange.

## What Changes

- **BREAKING** Replace markdown bulk operation API routes with YAML routes: `/markdown/import`, `/markdown/export`, and `/markdown/export/:name` become `/yaml/import`, `/yaml/export`, and `/yaml/export/:name`.
- **BREAKING** Replace markdown request and response fields with YAML fields: `{ "markdown": "..." }` becomes `{ "yaml": "..." }`.
- **BREAKING** Export raw YAML instead of a markdown document containing a fenced YAML block.
- **BREAKING** Rename user-facing frontend import/export labels, copy/download behavior, file extension, and MIME type from markdown to YAML.
- Rename implementation concepts, DTOs, tests, docs, and error terminology from markdown to YAML where they are part of the public or architectural contract.
- Preserve strict schema validation, deterministic export ordering, atomic validation-before-mutation, namespace upsert behavior, canonical `namespaces: [...]` export shape, and accepted single `namespace: ...` import shape.

## Capabilities

### New Capabilities

- None.

### Modified Capabilities

- `markdown-bulk-operations`: Replace the markdown bulk import/export contract with raw YAML bulk import/export semantics.
- `admin-frontend`: Replace admin markdown import/export UI behavior with YAML import/export support.
- `okvns-domain`: Replace invalid markdown terminology in public error semantics with invalid YAML terminology.

## Impact

- API routes, controllers, DTOs, shared transport types, contract tests, and documentation must change to the YAML contract.
- The bulk format package and application use cases should be renamed or reshaped so exported names align with YAML rather than markdown.
- The React admin API client, import/export pages, tests, and Playwright workflows must use YAML labels, payloads, output field names, `.yaml` downloads, and YAML MIME types.
- Existing clients using `/markdown/*`, markdown DTO fields, markdown labels, or fenced export output will break and must migrate to the YAML contract.
