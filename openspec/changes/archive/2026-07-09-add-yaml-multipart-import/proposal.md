## Why

API clients currently have to wrap YAML content in a JSON request body to import namespaces and entries. Some clients need to upload YAML files directly using `multipart/form-data`, which should work without changing the existing import validation, atomicity, or response shape.

## What Changes

- Extend `POST /yaml/import` to accept multipart file uploads in addition to the existing JSON `{ "yaml": "..." }` request body.
- Use a single multipart file field named `file` containing UTF-8 OKVNS YAML.
- Preserve the existing import behavior for validation, duplicate handling, atomicity, upsert semantics, and successful response payloads.
- Return safe validation errors for missing, empty, oversized, unreadable, or invalid uploaded YAML files.
- Update API docs and tests to cover direct multipart uploads.

## Capabilities

### New Capabilities

- None.

### Modified Capabilities

- `markdown-bulk-operations`: YAML import input formats now include multipart file upload through `POST /yaml/import`.

## Impact

- API: `apps/api/src/yaml/*` controller and upload validation.
- Tests: API contract tests for multipart upload success and failure cases.
- Docs: `docs/api-and-yaml.md` endpoint and import contract.
- Dependencies: likely uses NestJS `FileInterceptor` from the existing `@nestjs/platform-express` stack and Multer already present through that platform package.
