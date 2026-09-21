## 1. Fix request-parsing error mapping (only code change)

- [x] 1.1 In `apps/api/src/common/domain-exception.filter.ts`, map `MulterError` (`LIMIT_FILE_SIZE` → 413, all others incl. unexpected field → 400) and body-parser errors (`entity.too.large` → 413, `entity.parse.failed` → 400), all with code `VALIDATION_ERROR` and a safe message; never match on message text
- [x] 1.2 Add contract tests in `apps/api/src/api.contract.test.ts`: wrong upload field name → 400 `VALIDATION_ERROR` with storage untouched; oversized upload → 413; oversized JSON import body → 413; malformed JSON body → 400
- [x] 1.3 Run `pnpm --filter @okvns/api run test` and confirm the new tests fail without 1.1 and pass with it

## 2. Add tests for behavior that was documented nowhere

- [x] 2.1 `packages/yaml/src/yaml.test.ts`: namespace without `entries` parses to `[]`; non-array `entries` rejected; bare `description:` and `env_dependent:` (null) accepted as absent / `false`; `env_dependent: "true"` and numeric `description` still rejected
- [x] 2.2 `packages/application/src/yaml-use-cases.test.ts`: import over an existing namespace with no description clears it; import with a different description replaces it
- [x] 2.3 `packages/domain/src/entry.test.ts`: value of 65,536 accepted, 65,537 rejected, and a multi-code-unit value (e.g. an emoji) counts by string length
- [x] 2.4 `apps/api/src/api.contract.test.ts`: oversized entry value rejected on create and update (400, stored value unchanged); unknown query parameter on the entries list gives `property bogus should not exist` (the namespaces list case already exists)
- [x] 2.5 `packages/okvns-wrapper/src/wrapper.test.ts`: 404 with unreadable body returns default; 404 with an unrelated code throws; validation error exposes `code` and `details`; unreadable non-404 body gives `code` undefined
- [x] 2.6 Run `pnpm test:coverage` and confirm the 100% gates still hold

## 3. Update docs

- [x] 3.1 `docs/api-and-yaml.md`: state `entries` is optional (default `[]`); state YAML `null` means absent; state that import replaces the description and a missing one clears it
- [x] 3.2 `docs/api-and-yaml.md`: document the 65,536-character (UTF-16 code unit) entry value limit next to the 1000-character description limit
- [x] 3.3 `docs/api-and-yaml.md`: state unknown query parameters are rejected with the exact detail text; state the 1 MiB limit applies to JSON and multipart; state wrong upload field is 400
- [x] 3.4 `docs/api-and-yaml.md` "Success Responses": replace the millisecond-precision claim and the `.000Z` example wording with the whole-second note (MySQL whole seconds, memory driver milliseconds)
- [x] 3.5 `docs/api-and-yaml.md` or the OpenAPI section: state schema and path-parameter names are not contractual
- [x] 3.6 `docs/design-system.md` and `CLAUDE.md`: remove `.card` from the class lists and name `.panel.blueprint` as the framed element; confirm no other doc mentions `.card`
- [x] 3.7 `AGENTS.md`: add one sentence that import replaces an existing namespace's description as well as its entries
- [x] 3.8 Document the wrapper `code` / `details` fields in `packages/okvns-wrapper/README.md` if not already listed

## 4. Traceability and verification

- [x] 4.1 After syncing the delta specs, recompute scenario counts with `grep -c "^#### Scenario" openspec/specs/*/spec.md` and update `docs/traceability.md` (expected: `markdown-bulk-operations` 30, `okvns-domain` 11, `entry-management` 33, `namespace-management` 27, `okvns-wrapper-library` 18, `api-documentation` 13), adding the new test files where they change the primary-test column
- [x] 4.2 Run `pnpm lint`, `pnpm build` and `pnpm test`
- [x] 4.3 Ran the gated MySQL suite against a throwaway `mysql:26.7` container: 187 passed, 0 skipped (added a whole-second timestamp contract test in `mysql-persistence.contract.test.ts`)
- [x] 4.4 `openspec validate` passes; `/opsx:verify` run (see report: 2 warnings, 0 critical)
