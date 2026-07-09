## 1. API Contract Tests

- [x] 1.1 Add a contract test proving `POST /yaml/import` still imports valid YAML from a JSON `yaml` request field.
- [x] 1.2 Add a contract test proving `POST /yaml/import` imports valid YAML from multipart field `file`.
- [x] 1.3 Add contract tests for multipart missing file, empty file, oversized file, and invalid uploaded YAML.

## 2. Multipart Import Implementation

- [x] 2.1 Add NestJS multipart handling for `POST /yaml/import` using a single file field named `file`.
- [x] 2.2 Decode uploaded file content as UTF-8 text and route it through the existing `ImportYamlUseCase`.
- [x] 2.3 Preserve the existing JSON request body import path and response shape.
- [x] 2.4 Map upload validation failures to safe API errors without mutating storage.

## 3. Documentation

- [x] 3.1 Update `docs/api-and-yaml.md` to document both JSON and multipart request formats for `POST /yaml/import`.
- [x] 3.2 Document the multipart field name, expected UTF-8 YAML content, size limit behavior, and unchanged response shape.

## 4. Verification

- [x] 4.1 Run API tests for YAML import contract coverage.
- [x] 4.2 Run the relevant repository verification commands for the changed API and docs.
- [x] 4.3 Confirm `openspec validate add-yaml-multipart-import` passes.
