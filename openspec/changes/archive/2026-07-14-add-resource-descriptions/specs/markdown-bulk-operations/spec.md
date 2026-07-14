## MODIFIED Requirements

### Requirement: YAML import supports multiple namespaces
The system SHALL import YAML content containing one or more namespaces and their entries into durable storage. The canonical accepted shape MUST use a `namespaces` array, and the original single `namespace` shape MUST also be accepted for import compatibility. Clients MUST be able to submit YAML content either as a JSON `yaml` request field or as a multipart file field named `file` on `POST /yaml/import`. Namespace and entry `description` fields MAY be present and MUST be persisted after validation. Namespace and entry `created_at` and `modified_at` fields MAY be present in imported YAML, but their values MUST be ignored.

#### Scenario: Import multiple namespaces succeeds
- **WHEN** a client imports valid YAML with a `namespaces` array containing multiple namespace definitions through `POST /yaml/import` using a `yaml` request field
- **THEN** the system stores all namespaces, namespace descriptions, entries, and entry descriptions from the file

#### Scenario: Import single namespace shape succeeds
- **WHEN** a client imports valid YAML with a single `namespace` object through `POST /yaml/import` using a `yaml` request field
- **THEN** the system stores that namespace, its description, its entries, and their descriptions

#### Scenario: Import multipart YAML file succeeds
- **WHEN** a client uploads a valid UTF-8 YAML file through `POST /yaml/import` using multipart field `file`
- **THEN** the system stores the namespaces, descriptions, and entries from the uploaded file
- **AND** the response uses the same imported namespaces shape as JSON YAML imports

#### Scenario: Imported metadata is ignored
- **WHEN** a client imports valid YAML containing `created_at` and `modified_at` fields on namespaces or entries
- **THEN** the system accepts the metadata fields without treating them as unexpected keys
- **AND** the stored namespace and entry timestamps are assigned by the target storage operation rather than copied from the YAML document

### Requirement: YAML import validates schema strictly
The YAML importer MUST allow only the expected OKVNS keys and MUST reject invalid shapes, unexpected keys other than optional timestamp metadata, duplicate namespaces, duplicate entries, invalid names, non-string values, non-string descriptions, oversized descriptions, missing upload content, empty upload content, and payloads over the configured size limit.

#### Scenario: Unexpected key is rejected
- **WHEN** imported YAML contains a key outside the OKVNS allowlist
- **THEN** the system returns an invalid YAML validation error without mutating storage

#### Scenario: Duplicate namespace in file is rejected
- **WHEN** imported YAML contains the same namespace name more than once after normalization
- **THEN** the system returns a duplicate namespace error without mutating storage

#### Scenario: Duplicate entry in imported namespace is rejected
- **WHEN** imported YAML contains duplicate entry names in the same namespace after normalization
- **THEN** the system returns a duplicate entry error without mutating storage

#### Scenario: Invalid description in imported YAML is rejected
- **WHEN** imported YAML contains a namespace or entry description that is not a string or is longer than 1000 characters
- **THEN** the system returns an invalid YAML validation error without mutating storage

#### Scenario: Missing multipart file is rejected
- **WHEN** a client submits `POST /yaml/import` as multipart form data without the required `file` field
- **THEN** the system returns a safe validation error without mutating storage

#### Scenario: Empty multipart file is rejected
- **WHEN** a client uploads an empty YAML file through `POST /yaml/import`
- **THEN** the system returns an invalid YAML validation error without mutating storage

#### Scenario: Oversized multipart file is rejected
- **WHEN** a client uploads a YAML file larger than the configured import payload limit through `POST /yaml/import`
- **THEN** the system returns a safe validation error without mutating storage

### Requirement: YAML export uses canonical multiple namespace shape
The system SHALL export namespaces and entries from durable storage as raw YAML using a canonical `namespaces` array shape. The exported YAML MUST NOT be wrapped in a markdown code fence, and MUST include namespace and entry `created_at` and `modified_at` metadata. The exported YAML MUST include namespace and entry `description` fields when descriptions are stored.

#### Scenario: Export all namespaces succeeds
- **WHEN** a client requests a full YAML export from `GET /yaml/export`
- **THEN** the system returns a `yaml` response field containing all current namespaces and entries in deterministic order
- **AND** each exported namespace and entry includes `created_at` and `modified_at`
- **AND** each exported namespace and entry includes `description` when one is stored

#### Scenario: Export selected namespace succeeds
- **WHEN** a client requests YAML export for one existing namespace from `GET /yaml/export/:name`
- **THEN** the system returns a `yaml` response field containing only that namespace and its entries
- **AND** the exported namespace and its entries include `created_at` and `modified_at`
- **AND** the exported namespace and its entries include `description` when one is stored

#### Scenario: Export missing namespace returns not found
- **WHEN** a client requests YAML export for a namespace that does not exist
- **THEN** the system returns a safe namespace not-found error
