## Why

A recreation experiment rebuilt the codebase from `openspec/specs`, `docs/` and `CLAUDE.md`/`AGENTS.md` alone, then ran the original tests against the result. The failures show where the specs are silent or ambiguous: behavior the code has but no document states, and two places where the docs disagree with the code. Writing that behavior down makes the specs sufficient to rebuild the system, and fixes the wrong claims.

## What Changes

- Document that a YAML namespace's `entries` is optional and defaults to `[]`.
- Document that a bare YAML key (`description:` / `env_dependent:`, parsed as `null`) means "absent": no description, and `false`.
- Document that list endpoints reject unknown query parameters with 400 `VALIDATION_ERROR` and the detail `property <name> should not exist`.
- Document that importing over an existing namespace replaces its description too; an import without a description clears it. (Code already behaves this way: `description = VALUES(description)`.)
- Document the entry value limit: 65,536 UTF-16 code units (`value.length`), not bytes, for API, YAML and domain. The limit lives in `ENTRY_VALUE_MAX_LENGTH` and was in no spec.
- Document that the 1 MiB limit (`REQUEST_BODY_MAX_BYTES`) applies to JSON bodies as well as multipart uploads.
- **Fix** the timestamp claim: docs promise millisecond precision, but MySQL `TIMESTAMP` columns store whole seconds, so the default runtime always returns `.000Z`. Correct the docs (no migration); the memory driver keeps millisecond values.
- **Fix (code)** request-parsing errors that surface as 500: a wrong multipart upload field name (400), an oversized JSON body (413), and a malformed JSON body (400), all with code `VALIDATION_ERROR`. Multer and body-parser errors are not Nest `HttpException`s, so the exception filter had no mapping for them. Oversized multipart files already returned 413.
- Wrapper spec: a 404 whose body cannot be read still returns the default; wrapper errors expose `code` and `details` where the API supplied them.
- State that OpenAPI schema and path-parameter names are not part of the contract.
- Docs hygiene: `.card` is documented in `CLAUDE.md` and `docs/design-system.md` but is defined and used nowhere; framed elements are `.panel.blueprint`. Update `docs/traceability.md` for the new scenarios.

## Capabilities

### New Capabilities

None.

### Modified Capabilities

- `markdown-bulk-operations`: optional `entries`; YAML `null` handling; import replaces description; multipart wrong-field is 400; JSON body limit applies to import; malformed JSON is 400.
- `okvns-domain`: entry value maximum length and its unit.
- `entry-management`: entry value maximum length enforced at the API; unknown query parameters rejected on the entries list.
- `namespace-management`: unknown query parameters rejected on the namespaces list; timestamp precision.
- `okvns-wrapper-library`: unreadable 404 body returns the default; error `code`/`details` fields.
- `api-documentation`: OpenAPI schema and path-parameter names are not contractual.

## Impact

- **Docs:** `docs/api-and-yaml.md`, `docs/design-system.md`, `docs/traceability.md`, `CLAUDE.md`, `AGENTS.md` if it repeats the import summary.
- **Code (small):** `apps/api/src/common/domain-exception.filter.ts` gains multer and body-parser error mapping, with contract tests. Everything else is documented or tested behavior with no code change; add tests where none exist (YAML omitted `entries`, YAML `null`, unreadable-404 wrapper case, JSON body over 1 MiB).
- **No** API shape, migration, dependency, or storage change.
