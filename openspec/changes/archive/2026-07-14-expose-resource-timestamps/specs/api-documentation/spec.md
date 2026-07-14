## MODIFIED Requirements

### Requirement: Documented request and response schemas
The generated OpenAPI document SHALL describe API request bodies, response bodies, path parameters, validation constraints, multipart upload support, timestamp fields, and safe error shapes for documented endpoints.

#### Scenario: Namespace schemas are documented
- **WHEN** the OpenAPI document describes namespace endpoints
- **THEN** it documents namespace names, namespace response bodies, namespace `created_at` and `modified_at` fields, namespace create and rename request bodies, path parameters, success responses, and relevant error responses

#### Scenario: Entry schemas are documented
- **WHEN** the OpenAPI document describes entry endpoints
- **THEN** it documents entry names, entry values, entry response bodies, entry `created_at` and `modified_at` fields, entry create and update request bodies, path parameters, success responses, and relevant error responses

#### Scenario: YAML import and export schemas are documented
- **WHEN** the OpenAPI document describes YAML endpoints
- **THEN** it documents JSON YAML import, multipart YAML file import, optional imported timestamp metadata, YAML export timestamp metadata, YAML export responses, success responses, and relevant validation or not-found error responses

#### Scenario: Probe schemas are documented
- **WHEN** the OpenAPI document describes health and readiness endpoints
- **THEN** it documents their successful response bodies and the readiness not-ready error response
