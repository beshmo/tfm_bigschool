## 1. Package Scaffold

- [x] 1.1 Create `packages/okvns-wrapper` with package manifest, TypeScript config, Vitest config, and source entrypoint.
- [x] 1.2 Ensure the new package is included by the pnpm workspace and existing root build, lint, typecheck, test, and coverage flows.
- [x] 1.3 Export public wrapper types, `OkvnsWrapper`, and typed wrapper errors from the package entrypoint.

## 2. Wrapper Implementation

- [x] 2.1 Implement `OkvnsWrapper` construction with explicit `baseUrl`, trailing-slash normalization, and optional fetch injection.
- [x] 2.2 Implement `read(namespace, entry, defaultValue): Promise<string>` using `GET /namespaces/:namespace/entries/:entry`.
- [x] 2.3 Encode namespace and entry path segments before issuing the request.
- [x] 2.4 Return the entry value for successful API responses that contain a string `value`.
- [x] 2.5 Return `defaultValue` for namespace-not-found and entry-not-found API responses.
- [x] 2.6 Throw typed wrapper errors for network failures, validation failures, server failures, missing fetch, malformed success responses, and unexpected error responses.

## 3. Tests

- [x] 3.1 Add tests for successful reads and response value extraction.
- [x] 3.2 Add tests for default-on-404 behavior for missing namespaces and missing entries.
- [x] 3.3 Add tests for URL encoding and base URL normalization.
- [x] 3.4 Add tests for injected fetch usage and missing global fetch behavior.
- [x] 3.5 Add tests for network failures, validation failures, server failures, malformed successful responses, and malformed error responses.

## 4. Documentation

- [x] 4.1 Document basic wrapper usage with an external already-running OKVNS API.
- [x] 4.2 Document default-on-not-found behavior and the failure cases that throw typed errors.
- [x] 4.3 Update workspace documentation/indexes if the new package changes the documented repository layout.

## 5. Verification

- [x] 5.1 Run package-level wrapper tests.
- [x] 5.2 Run root lint, typecheck, test, and build commands.
- [x] 5.3 Validate the OpenSpec change before implementation is considered complete.
