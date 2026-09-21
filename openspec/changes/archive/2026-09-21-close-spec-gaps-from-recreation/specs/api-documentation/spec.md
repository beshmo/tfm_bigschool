## ADDED Requirements

### Requirement: Schema and parameter names are not contractual
The OpenAPI document SHALL describe every documented request, response and path parameter, but the names of generated schemas (for example `NamespaceInputDto`) and of path placeholders (for example `{namespace}`) are implementation details. Consumers SHALL NOT depend on them, and renaming them is not a breaking change.

#### Scenario: Content is documented regardless of names
- **WHEN** a client reads the OpenAPI document
- **THEN** every route documents its parameters, request body and responses without requiring particular schema or placeholder names
