## ADDED Requirements

### Requirement: YAML namespace entries are optional
The YAML importer SHALL treat a namespace's `entries` key as optional and SHALL import a namespace without `entries` as a namespace with no entries.

#### Scenario: Namespace without entries key is imported empty
- **WHEN** imported YAML contains a namespace with a valid `name` and no `entries` key
- **THEN** the system creates or replaces that namespace with an empty entry collection

#### Scenario: Non-array entries value is rejected
- **WHEN** imported YAML contains a namespace whose `entries` value is present but not an array
- **THEN** the system rejects the import with `INVALID_YAML` without mutating storage

### Requirement: YAML null values mean absent
The YAML importer SHALL treat a key present with no value (YAML `null`) for `description` or `env_dependent` as if the key were omitted: no description, and `env_dependent` of `false`. Any other non-string description or non-boolean `env_dependent` SHALL still be rejected.

#### Scenario: Bare description key means no description
- **WHEN** imported YAML contains `description:` with no value on a namespace or entry
- **THEN** the system imports that resource with no description

#### Scenario: Bare env_dependent key means false
- **WHEN** imported YAML contains `env_dependent:` with no value on an entry
- **THEN** the system imports that entry with `env_dependent` set to `false`

#### Scenario: Non-null wrong type is still rejected
- **WHEN** imported YAML contains `env_dependent: "true"` or a numeric `description`
- **THEN** the system rejects the import with `INVALID_YAML` without mutating storage

### Requirement: Import request size limit applies to both formats
The system SHALL reject import requests larger than 1 MiB with HTTP 413 whether they arrive as a JSON body or as a multipart upload.

#### Scenario: Oversized JSON body is rejected
- **WHEN** a client posts a JSON import body larger than 1 MiB
- **THEN** the system responds with HTTP 413 and a safe error body without mutating storage

#### Scenario: Oversized upload is rejected
- **WHEN** a client uploads a multipart file larger than 1 MiB
- **THEN** the system responds with HTTP 413 and a safe error body without mutating storage

### Requirement: Multipart upload field name is validated
The system SHALL accept the multipart import file only in a field named `file` and SHALL respond with HTTP 400 and code `VALIDATION_ERROR` when the file arrives under any other field name. Multipart parser errors other than oversize SHALL NOT surface as HTTP 500.

#### Scenario: Wrong upload field name is a client error
- **WHEN** a client uploads a multipart file in a field named anything other than `file`
- **THEN** the system responds with HTTP 400 and code `VALIDATION_ERROR` without mutating storage

### Requirement: Malformed request bodies are client errors
The system SHALL respond with HTTP 400 and code `VALIDATION_ERROR` when a JSON request body cannot be parsed, and SHALL NOT surface body-parsing failures as HTTP 500.

#### Scenario: Malformed JSON body is a client error
- **WHEN** a client sends a request with `Content-Type: application/json` and a body that is not valid JSON
- **THEN** the system responds with HTTP 400 and code `VALIDATION_ERROR` with no stack trace

## MODIFIED Requirements

### Requirement: YAML import upserts namespaces
The system SHALL apply a valid import by replacing each imported namespace's entries and description when that namespace already exists and creating namespaces that do not exist. An imported namespace without a description SHALL clear the existing description.

#### Scenario: Existing namespace is replaced by import
- **WHEN** a valid YAML import contains a namespace that already exists
- **THEN** the system replaces that namespace's entries with the imported entries

#### Scenario: Import without description clears existing description
- **WHEN** a valid YAML import contains an existing namespace that has a stored description but the imported namespace has no description
- **THEN** the namespace has no description after the import

#### Scenario: Import with description replaces existing description
- **WHEN** a valid YAML import contains an existing namespace with a different description
- **THEN** the namespace carries the imported description after the import
