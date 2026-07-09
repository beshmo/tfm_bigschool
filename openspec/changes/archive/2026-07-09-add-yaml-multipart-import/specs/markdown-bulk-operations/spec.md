## MODIFIED Requirements

### Requirement: YAML import supports multiple namespaces
The system SHALL import YAML content containing one or more namespaces and their entries. The canonical accepted shape MUST use a `namespaces` array, and the original single `namespace` shape MUST also be accepted for import compatibility. Clients MUST be able to submit YAML content either as a JSON `yaml` request field or as a multipart file field named `file` on `POST /yaml/import`.

#### Scenario: Import multiple namespaces succeeds
- **WHEN** a client imports valid YAML with a `namespaces` array containing multiple namespace definitions through `POST /yaml/import` using a `yaml` request field
- **THEN** the system stores all namespaces and entries from the file

#### Scenario: Import single namespace shape succeeds
- **WHEN** a client imports valid YAML with a single `namespace` object through `POST /yaml/import` using a `yaml` request field
- **THEN** the system stores that namespace and its entries

#### Scenario: Import multipart YAML file succeeds
- **WHEN** a client uploads a valid UTF-8 YAML file through `POST /yaml/import` using multipart field `file`
- **THEN** the system stores the namespaces and entries from the uploaded file
- **AND** the response uses the same imported namespaces shape as JSON YAML imports

### Requirement: YAML import validates schema strictly
The YAML importer MUST allow only the expected OKVNS keys and MUST reject invalid shapes, unexpected keys, duplicate namespaces, duplicate entries, invalid names, non-string values, missing upload content, empty upload content, and payloads over the configured size limit.

#### Scenario: Unexpected key is rejected
- **WHEN** imported YAML contains a key outside the OKVNS allowlist
- **THEN** the system returns an invalid YAML validation error without mutating storage

#### Scenario: Duplicate namespace in file is rejected
- **WHEN** imported YAML contains the same namespace name more than once after normalization
- **THEN** the system returns a duplicate namespace error without mutating storage

#### Scenario: Duplicate entry in imported namespace is rejected
- **WHEN** imported YAML contains duplicate entry names in the same namespace after normalization
- **THEN** the system returns a duplicate entry error without mutating storage

#### Scenario: Missing multipart file is rejected
- **WHEN** a client submits `POST /yaml/import` as multipart form data without the required `file` field
- **THEN** the system returns a safe validation error without mutating storage

#### Scenario: Empty multipart file is rejected
- **WHEN** a client uploads an empty YAML file through `POST /yaml/import`
- **THEN** the system returns an invalid YAML validation error without mutating storage

#### Scenario: Oversized multipart file is rejected
- **WHEN** a client uploads a YAML file larger than the configured import payload limit through `POST /yaml/import`
- **THEN** the system returns a safe validation error without mutating storage
