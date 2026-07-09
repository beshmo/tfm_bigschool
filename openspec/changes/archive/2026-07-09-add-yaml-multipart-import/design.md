## Context

`POST /yaml/import` currently accepts JSON with a `yaml` string and routes that string through `ImportYamlUseCase`. The YAML parser already enforces strict OKVNS shape validation, size limits, duplicate checks, atomic validation-before-mutation, and upsert semantics. The new requirement is to let clients upload a YAML file directly to the same endpoint with `multipart/form-data`.

The API is a NestJS app using the Express platform. NestJS supports multipart uploads through `@nestjs/platform-express` file interceptors backed by Multer, which is already part of the platform dependency graph.

## Goals / Non-Goals

**Goals:**

- Allow `POST /yaml/import` to accept a single multipart file field named `file`.
- Preserve the existing JSON `{ "yaml": "..." }` import contract.
- Convert uploaded file bytes to UTF-8 text and call the same import use case used by JSON requests.
- Return safe client errors for missing, empty, oversized, unreadable, or invalid uploaded files.
- Document and test the multipart request contract.

**Non-Goals:**

- Do not add filesystem-backed upload storage; uploaded YAML should remain in memory for request handling only.
- Do not add persistence beyond the existing in-memory repository.
- Do not change YAML document shape, import atomicity, duplicate handling, upsert behavior, or export behavior.
- Do not add authentication or authorization.

## Decisions

### Accept JSON and multipart on the same endpoint

`POST /yaml/import` will continue to support `application/json` and will also accept `multipart/form-data`.

Rationale: This avoids a breaking change for existing JSON clients while meeting the direct file upload requirement. A separate endpoint such as `/yaml/import-file` would duplicate the public import concept and increase documentation and test surface without adding behavior.

### Use a single `file` multipart field

Multipart clients MUST send the YAML upload in a field named `file`.

Rationale: A conventional fixed field name keeps the API simple and testable. Additional fields are unnecessary because the YAML document already carries the full import payload.

### Keep uploaded files in memory

The API should use memory handling for the uploaded YAML content, then pass `file.buffer.toString('utf8')` into `ImportYamlUseCase`.

Rationale: The MVP explicitly avoids filesystem-backed persistence and persistent volumes. In-memory upload handling also keeps validation atomic and avoids cleanup concerns.

### Reuse existing YAML validation path

Multipart upload handling should only extract text. YAML parsing, schema validation, duplicate checks, size enforcement, and domain conversion remain in the existing parser and use case.

Rationale: A single validation path prevents behavior drift between JSON imports and file imports. Upload-specific checks should be limited to request/file presence and basic file size handling before decoding.

## Risks / Trade-offs

- Content-Type mismatch can make request routing ambiguous -> Prefer inspecting request content type in the controller and handling JSON and multipart paths explicitly.
- Multer file size errors may not naturally map to the existing safe error shape -> Add tests for oversized multipart uploads and map the failure to a safe 400 response.
- MIME types for YAML files vary by client and OS -> Do not rely solely on MIME type for correctness; validate the decoded YAML content through the existing parser. File extension/MIME checks can be advisory or omitted.
- UTF-8 decoding errors can be subtle -> Treat unreadable or empty decoded content as invalid YAML and return the same safe validation shape used for invalid imports.
