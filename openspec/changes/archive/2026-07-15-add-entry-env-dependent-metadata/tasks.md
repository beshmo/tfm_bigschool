## 1. Shared and Domain Model

- [x] 1.1 Add `env_dependent: boolean` to shared entry response/input DTO contracts with default-false expectations documented in comments.
- [x] 1.2 Update the domain `Entry` model to store, rehydrate, update, and serialize `env_dependent`.
- [x] 1.3 Update domain and application tests for create, default false, true preservation, and update behavior.

## 2. Application and Persistence

- [x] 2.1 Extend entry create/update use cases and YAML import use cases to accept and preserve `env_dependent`.
- [x] 2.2 Update the in-memory repository to preserve `env_dependent` and update timestamps when the flag changes.
- [x] 2.3 Add a repeatable MySQL migration for a non-null `entries.env_dependent` column with default false.
- [x] 2.4 Update MySQL repository mapping, integration tests, and migration tests to persist default false and true values across reloads.

## 3. API and Documentation

- [x] 3.1 Update entry create/update DTO validation so `env_dependent` is optional on input and must be boolean when present.
- [x] 3.2 Update API response schemas and contract tests so entry list, detail, create, and update responses include `env_dependent`.
- [x] 3.3 Update OpenAPI schema metadata for entry and YAML contracts, including validation error coverage for non-boolean values.

## 4. YAML Import and Export

- [x] 4.1 Update the YAML parser to accept entry `env_dependent`, default omitted values to false, and reject non-boolean values.
- [x] 4.2 Update YAML serialization to emit `env_dependent` for every exported entry, including false values.
- [x] 4.3 Add parser, serializer, and YAML use-case tests for import defaulting, true preservation, invalid values, and full/selected export output.

## 5. Admin Frontend

- [x] 5.1 Update frontend API input types and mapping to send and expose entry `env_dependent`.
- [x] 5.2 Add entry create/edit controls for the environment-dependent flag.
- [x] 5.3 Add namespace detail UI affordance to locate environment-dependent entries, such as a filter showing only flagged entries.
- [x] 5.4 Update React Testing Library tests for create, update, display, and filtering behavior.

## 6. Verification

- [x] 6.1 Run targeted package tests for domain, application, YAML, API, and admin frontend changes.
- [x] 6.2 Run repo-level `pnpm test`, `pnpm typecheck`, and `pnpm build` if available.
- [x] 6.3 Run `openspec validate add-entry-env-dependent-metadata --strict` and resolve any spec/task issues.
