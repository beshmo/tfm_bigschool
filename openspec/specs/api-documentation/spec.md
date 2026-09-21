## Purpose

Generated API documentation for OKVNS. Provides a machine-readable OpenAPI document and interactive Swagger UI for implemented API endpoints, schemas, request formats, and safe error responses.

## Requirements

### Requirement: Generated OpenAPI document
The API SHALL expose a machine-readable OpenAPI document generated from the implemented NestJS controllers and API-facing schemas.

#### Scenario: Raw OpenAPI document is available
- **WHEN** a client requests the documented raw OpenAPI endpoint
- **THEN** the API returns a successful OpenAPI document response

#### Scenario: OpenAPI document includes implemented routes
- **WHEN** the raw OpenAPI document is generated
- **THEN** it includes the health, readiness, namespace, entry, YAML import, and YAML export routes implemented by the API

#### Scenario: OpenAPI document preserves existing API behavior
- **WHEN** OpenAPI documentation is added
- **THEN** existing API routes, request bodies, response bodies, status codes, and storage behavior remain unchanged

### Requirement: Swagger UI
The API SHALL expose an interactive Swagger UI for the generated OpenAPI document.

#### Scenario: Swagger UI is available
- **WHEN** a developer opens the documented Swagger UI endpoint
- **THEN** the API serves an interactive documentation page backed by the generated OpenAPI document

### Requirement: Documented request and response schemas
The generated OpenAPI document SHALL describe API request bodies, response bodies, path parameters, query parameters, validation constraints, multipart upload support, description fields, entry `env_dependent` fields, timestamp fields, paginated list response fields, and safe error shapes for documented endpoints.

#### Scenario: Namespace schemas are documented
- **WHEN** the OpenAPI document describes namespace endpoints
- **THEN** it documents namespace names, optional namespace descriptions with the 1000-character limit, paginated namespace list response bodies whose items do not include `entries`, namespace detail response bodies that include entries, namespace `created_at` and `modified_at` fields, namespace create and update request bodies, path parameters, namespace list query parameters, success responses, and relevant error responses

#### Scenario: Entry schemas are documented
- **WHEN** the OpenAPI document describes entry endpoints
- **THEN** it documents entry names, entry values, optional entry descriptions with the 1000-character limit, entry `env_dependent` request, response, filter, and ordering fields, paginated entry list response bodies, entry response bodies, entry `created_at` and `modified_at` fields, entry create and update request bodies, path parameters, entry list query parameters, success responses, and relevant error responses

#### Scenario: YAML import and export schemas are documented
- **WHEN** the OpenAPI document describes YAML endpoints
- **THEN** it documents JSON YAML import, multipart YAML file import, optional imported description fields, optional imported timestamp metadata, optional imported entry `env_dependent` fields, YAML export description, timestamp, and entry `env_dependent` metadata, YAML export responses, success responses, and relevant validation or not-found error responses

#### Scenario: Probe schemas are documented
- **WHEN** the OpenAPI document describes health and readiness endpoints
- **THEN** it documents their successful response bodies and the readiness not-ready error response

### Requirement: Developer documentation links generated docs
Project documentation SHALL tell developers where to find the generated Swagger UI and raw OpenAPI document when running the API.

#### Scenario: Developer finds generated API docs
- **WHEN** a developer reads the project API documentation
- **THEN** it identifies the Swagger UI endpoint and raw OpenAPI document endpoint

### Requirement: Documented error codes and success responses
The Markdown API reference (`docs/api-and-yaml.md`) SHALL list every error code with its HTTP status and meaning, describe the `details` array, and state the success status and body of every route.

#### Scenario: Error code table is complete
- **WHEN** a reader consults the error codes section
- **THEN** it lists `VALIDATION_ERROR`, `INVALID_YAML`, `NAMESPACE_NOT_FOUND`, `ENTRY_NOT_FOUND`, `DUPLICATE_NAMESPACE`, `DUPLICATE_ENTRY`, and `INTERNAL_ERROR` with the statuses defined by `STATUS_BY_CODE`

#### Scenario: Framework errors are explained
- **WHEN** a reader looks up unknown routes, oversized uploads, or a failed readiness check
- **THEN** the reference states which code and status each one returns

#### Scenario: Success responses are specified
- **WHEN** a reader consults the success responses section
- **THEN** it gives the status (201 for creations and import, 204 without body for deletions, 200 otherwise), example namespace and entry payloads, the ISO 8601 UTC timestamp format, and the `/health` and `/ready` bodies

### Requirement: Schema and parameter names are not contractual
The OpenAPI document SHALL describe every documented request, response and path parameter, but the names of generated schemas (for example `NamespaceInputDto`) and of path placeholders (for example `{namespace}`) are implementation details. Consumers SHALL NOT depend on them, and renaming them is not a breaking change.

#### Scenario: Content is documented regardless of names
- **WHEN** a client reads the OpenAPI document
- **THEN** every route documents its parameters, request body and responses without requiring particular schema or placeholder names
