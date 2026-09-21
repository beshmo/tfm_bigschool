# Recreation From Specs: Comparison Report

An experiment: the whole codebase (`apps/*`, `packages/*`) was deleted (commit `17ca9bc`) and
recreated from `openspec/specs`, `docs/`, `CLAUDE.md`/`AGENTS.md`, the surviving root config,
`pnpm-lock.yaml` and the `e2e/` specs, **without reading the original code**. The original
(commit `0117514`) was then used only as an oracle: its own tests were run against the
recreation to find where the specs are silent or ambiguous.

The recreation lives on branch `recreate/from-specs`.

## Verification of the recreation

| Check                   | Result                                                                                               |
| ----------------------- | ---------------------------------------------------------------------------------------------------- |
| Lint, typecheck, build  | Clean across the workspace                                                                           |
| Unit and contract tests | shared 31, domain 89, yaml 55, application 81, wrapper 28, api 168, admin-web 129, demo-web 23       |
| Coverage gates          | 100% statements and branches for domain, application, yaml (also shared and wrapper)                 |
| Playwright E2E          | The 7 real specs in `e2e/` pass in Chromium against the built admin and the live API (memory driver) |
| `pnpm deploy --prod`    | The deployed tree boots and serves the API and OpenAPI document; the migration script guard works    |
| Entrypoint script       | `env.js` output verified, including escaping of quotes and backslashes                               |
| **Not verified**        | MySQL adapter against a real database (21 gated tests skipped); Docker image builds (no Docker here) |

## Caveats

- The initial inventory shown to the recreator listed the original's file names, line counts and
  exports, so the file layout is **not** independent evidence that the specs suffice.
- The entry value limit (65,536) came from that inventory; no spec defines it.
- The OpenAPI title and tags were mirrored from a version-bump diff supplied during the session.

## Oracle results

| Original test set               | Result against the recreation                                                      |
| ------------------------------- | ---------------------------------------------------------------------------------- |
| `packages/shared`               | 11 of 11 pass                                                                      |
| API contract test (1,099 lines) | 103 of 112 pass unmodified                                                         |
| `packages/yaml`                 | 36 of 42 pass; 4 real behavior gaps, 2 input-shape differences                     |
| `packages/okvns-wrapper`        | 4 failures (behavior gaps, see below)                                              |
| domain, application             | Mostly signature differences (public class and method shapes are not in the specs) |
| admin API client, demo-web      | Signature and prop differences; not a behavior signal                              |

## Spec gaps found

Behavior where the original differs and the specs are silent or ambiguous:

1. **YAML `entries` is optional.** The original defaults a namespace without `entries` to `[]`.
   The docs list `name`, `entries`, optional `description` without saying which is required.
   The recreation made `entries` required.
2. **YAML `null` values.** A bare key (`description:` or `env_dependent:` with no value) is accepted
   by the original: no description, and `false`. The recreation rejected both as non-string and
   non-boolean.
3. **Unknown query parameters.** The original returns 400 with the detail
   `property x should not exist` on list endpoints. The docs specify allowlisted values but not
   unknown parameters; the recreation ignored them.
4. **Wrapper edge cases.**
   - A 404 whose body cannot be read still returns the default in the original; the recreation threw
     `OkvnsUnexpectedResponseError`.
   - The original's errors carry `code` and `details` fields and path-specific messages; the
     recreation's do not.
5. **OpenAPI naming.** The original uses path placeholders such as `{namespace}` and schema names such
   as `NamespaceInputDto`, `NamespaceResponse` and `PaginatedNamespaceListResponse`. The spec requires
   the content to be documented but never names either.
6. **Choices the docs do not settle.**
   - Whether importing over an existing namespace replaces or keeps its description (the recreation
     kept it when the import has none).
   - The maximum entry value length.
   - Timestamp precision: the docs say milliseconds, but the columns are whole-second `TIMESTAMP`s,
     so the API always shows `.000Z`.

Not gaps, by design: public signatures of domain entities, use cases, the frontend API client and the
demo `App` props. The specs describe behavior, not class shapes.

## Changes made beyond the specs

- **Multer error mapping.** Multer 2.x words its error "Unexpected file field", which Nest does not
  translate, so a wrong upload field name surfaced as 500. The exception filter now maps multer
  errors: oversized file is 413, anything else is 400.
- **`files` allowlist** in `apps/api/package.json`, so runtime images ship only `dist`, `scripts`
  and `migrations`.
- **`.card` removed from the docs**: nothing uses it; framed elements are `.panel.blueprint`.
- **OpenAPI version** is read from the API's `package.json` instead of being hard-coded.

## Suggested follow-ups

- Decide gaps 1 to 4 and either align the code or write the decision into the specs.
- Name the OpenAPI schemas and path parameters in `api-documentation` if consumers depend on them.
- Run the gated MySQL suites (`OKVNS_TEST_MYSQL_*`) and the Docker builds in CI to close the
  unverified items above.
