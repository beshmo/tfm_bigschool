## ADDED Requirements

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
The generated OpenAPI document SHALL describe API request bodies, response bodies, path parameters, validation constraints, multipart upload support, and safe error shapes for documented endpoints.

#### Scenario: Namespace schemas are documented
- **WHEN** the OpenAPI document describes namespace endpoints
- **THEN** it documents namespace names, namespace response bodies, namespace create and rename request bodies, path parameters, success responses, and relevant error responses

#### Scenario: Entry schemas are documented
- **WHEN** the OpenAPI document describes entry endpoints
- **THEN** it documents entry names, entry values, entry response bodies, entry create and update request bodies, path parameters, success responses, and relevant error responses

#### Scenario: YAML import and export schemas are documented
- **WHEN** the OpenAPI document describes YAML endpoints
- **THEN** it documents JSON YAML import, multipart YAML file import, YAML export responses, success responses, and relevant validation or not-found error responses

#### Scenario: Probe schemas are documented
- **WHEN** the OpenAPI document describes health and readiness endpoints
- **THEN** it documents their successful response bodies and the readiness not-ready error response

### Requirement: Developer documentation links generated docs
Project documentation SHALL tell developers where to find the generated Swagger UI and raw OpenAPI document when running the API.

#### Scenario: Developer finds generated API docs
- **WHEN** a developer reads the project API documentation
- **THEN** it identifies the Swagger UI endpoint and raw OpenAPI document endpoint
