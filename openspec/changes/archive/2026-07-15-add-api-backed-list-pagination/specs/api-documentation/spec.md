## MODIFIED Requirements

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
