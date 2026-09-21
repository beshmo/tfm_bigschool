## ADDED Requirements

### Requirement: Entry value length limit at the API
The API SHALL reject entry create and update requests whose `value` exceeds 65,536 characters with HTTP 400 and code `VALIDATION_ERROR`, and SHALL document the limit as `maxLength` in the OpenAPI document.

#### Scenario: Oversized value is rejected on create
- **WHEN** a client creates an entry with a value of 65,537 characters
- **THEN** the API responds with HTTP 400 and code `VALIDATION_ERROR` without storing the entry

#### Scenario: Oversized value is rejected on update
- **WHEN** a client updates an entry to a value of 65,537 characters
- **THEN** the API responds with HTTP 400 and code `VALIDATION_ERROR` and the stored value is unchanged

### Requirement: Entry listing rejects unknown query parameters
`GET /namespaces/:name/entries` SHALL reject any query parameter other than the documented `page`, `page_size`, `sort`, `direction` and `env_dependent` with HTTP 400, code `VALIDATION_ERROR`, and the detail `property <name> should not exist`.

#### Scenario: Unknown query parameter is rejected
- **WHEN** a client calls `GET /namespaces/:name/entries?bogus=1`
- **THEN** the API responds with HTTP 400 and code `VALIDATION_ERROR`
- **AND** the error details contain `property bogus should not exist`
