## ADDED Requirements

### Requirement: Unreadable 404 still returns the default
The wrapper SHALL return the caller's default value for an HTTP 404 response whose error body is missing, empty, or not parseable as an OKVNS error. A 404 that carries a code other than `NAMESPACE_NOT_FOUND` or `ENTRY_NOT_FOUND` SHALL be surfaced as a typed error instead.

#### Scenario: 404 with unreadable body returns default
- **WHEN** the API responds 404 with a body that is not valid JSON
- **THEN** `read` resolves to the default value

#### Scenario: 404 with an unrelated error code throws
- **WHEN** the API responds 404 with an error code that is not a not-found code
- **THEN** `read` rejects with a typed wrapper error

### Requirement: Wrapper errors expose API error fields
Wrapper errors caused by an API error response SHALL expose the API's error `code` when present, and validation errors SHALL also expose `details` when present. Both fields SHALL be `undefined` when the API did not supply them.

#### Scenario: Validation error carries code and details
- **WHEN** the API responds 400 with code `VALIDATION_ERROR` and details
- **THEN** the rejected `OkvnsValidationError` exposes `code` and `details`

#### Scenario: Unparseable error body has no code
- **WHEN** the API responds with a non-404 error and an unreadable body
- **THEN** the rejected wrapper error has `code` undefined
