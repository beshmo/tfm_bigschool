## ADDED Requirements

### Requirement: Namespace listing rejects unknown query parameters
`GET /namespaces` SHALL reject any query parameter other than the documented `page`, `page_size`, `sort` and `direction` with HTTP 400, code `VALIDATION_ERROR`, and the detail `property <name> should not exist`.

#### Scenario: Unknown query parameter is rejected
- **WHEN** a client calls `GET /namespaces?bogus=1`
- **THEN** the API responds with HTTP 400 and code `VALIDATION_ERROR`
- **AND** the error details contain `property bogus should not exist`

### Requirement: Timestamp format and precision
The API SHALL return `created_at` and `modified_at` as ISO 8601 UTC strings. Sub-second precision is NOT guaranteed: durable MySQL storage records whole seconds, so values from the default runtime carry `.000Z`, while the in-memory driver may carry milliseconds. Clients SHALL NOT rely on sub-second ordering; ties are broken by name as documented for list sorting.

#### Scenario: Timestamps are ISO 8601 UTC
- **WHEN** a client retrieves a namespace or entry
- **THEN** `created_at` and `modified_at` are ISO 8601 strings in UTC

#### Scenario: MySQL storage returns whole-second values
- **WHEN** a client retrieves a resource stored in MySQL
- **THEN** its timestamps have zero milliseconds
