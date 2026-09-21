## Context

The recreation experiment (see the pasted comparison report) rebuilt the system from specs and docs. Where the original tests failed, the specs were silent. Before writing anything, each proposed default was checked against the code on `main`:

| Default | Code on `main` | Result |
| --- | --- | --- |
| `entries` optional, defaults to `[]` | `parseEntries` returns `[]` when `raw === undefined` (`packages/yaml/src/parser.ts:93`) | Matches |
| YAML `null` description / `env_dependent` means absent | `parseDescription` and `parseEnvDependent` accept `undefined` or `null` | Matches |
| Unknown query params rejected | Global `ValidationPipe` with `whitelist` and `forbidNonWhitelisted` (`app-globals.ts`); contract test at `api.contract.test.ts:283` | Matches |
| Wrapper: unreadable 404 returns default | `wrapper.ts:141-147`: bare 404 with no parsed code returns the default | Matches |
| Wrapper errors expose `code` / `details` | `errors.ts` fields `code`, `details` | Matches |
| Import replaces description | MySQL upsert sets `description = VALUES(description)`; import builds fresh aggregates | Matches |
| Entry value limit | `value.length > ENTRY_VALUE_MAX_LENGTH` (`entry.ts:38`), so UTF-16 code units, not bytes | Matches, unit recorded |
| 1 MiB limit applies to JSON | `app.use(json({ limit: config.bodyLimitBytes }))`, fixed to `REQUEST_BODY_MAX_BYTES` | Matches |
| Timestamps whole-second | Migration uses `TIMESTAMP` (no fractional digits); memory repository uses `toISOString()` | **Docs were wrong**: promised milliseconds |
| Wrong upload field is 400 | No multer mapping in `DomainExceptionFilter`; only `FileInterceptor('file', ...)` | **Code differs**: Multer 2.x's message is not translated by Nest, so this surfaces as 500 |
| JSON body over 1 MiB is 413 | body-parser's error is not a Nest `HttpException`, so it fell through to the 500 branch (found while writing the test) | **Code differs**: same root cause as multer; malformed JSON was affected too |
| `.card` documented | Not defined in `styles.css`, not used in `admin-web` | **Docs were wrong** |

So most of the change is documentation, plus one code fix (request-parsing errors from multer and body-parser reaching the 500 branch) and a few missing tests.

## Goals / Non-Goals

**Goals:**
- Make each behavior above stated in a spec and, where user-facing, in `docs/api-and-yaml.md`.
- Correct the two false doc claims (millisecond timestamps, `.card`).
- Fix the request-parsing 500s (multer, body-parser) and cover them with contract tests.
- Add a test for every new scenario that has none.

**Non-Goals:**
- No migration to `TIMESTAMP(3)`. It would change stored data and the API output for no requirement.
- No change to public signatures, class shapes, or OpenAPI schema names.
- No new error codes. Only statuses the API already documents (400, 413) are newly produced for request-parsing failures.

## Decisions

- **Document, don't change, when code already matches.** Eight of the eleven findings are pure spec gaps; changing behavior there would risk clients for no gain. The other three (timestamps, `.card`, request-parsing 500s) were wrong docs or a code bug.
- **Timestamps: fix the docs, not the schema.** Whole-second precision is already the observable behavior of the default runtime, and sorting already has a name tiebreaker. Alternative considered: `TIMESTAMP(3)` migration. Rejected: a schema change on live data to satisfy a sentence in the docs.
- **Value limit unit is UTF-16 code units.** It is what the code does and what `@MaxLength` validates. Documenting "bytes" would be wrong, and switching to bytes would be a breaking change.
- **Request-parsing errors map inside the existing exception filter.** `MulterError` with `LIMIT_FILE_SIZE` maps to 413 `VALIDATION_ERROR`; any other `MulterError`, including the unexpected-field error, maps to 400. body-parser errors map by `type`: `entity.too.large` to 413, `entity.parse.failed` to 400. Only these tested cases are mapped; other body-parser types still reach 500. It adds no new error code and reuses `codeForStatus`; the statuses (400/413) are set in the filter, like the existing `HttpException` path, rather than through `STATUS_BY_CODE`. Alternative: a dedicated interceptor. Rejected as more surface for the same result. The mapping matches by `name`/`code`/`type`, never by message text, because message text is what broke.
- **OpenAPI names are declared non-contractual** rather than pinned, since no consumer generates clients from them.

## Risks / Trade-offs

- [Multer error detection depends on the multer major version] → match on `MulterError` and its `code`, and add a contract test that would fail on a wording change.
- [Documenting whole-second precision could surprise readers of the memory driver, which returns milliseconds] → the spec states both and says sub-second precision is not guaranteed.
- [Specs assert MySQL-specific timestamp behavior that the gated MySQL tests cover but default CI skips] → the scenario is covered by the `OKVNS_TEST_MYSQL_*` suite; keep it in the run list.
- [`traceability.md` counts drift again] → update counts in the same change.

## Open Questions

- Should `AGENTS.md` repeat the "replaces description" rule, or link to `docs/api-and-yaml.md`? Default: add one sentence to match the existing import summary.
