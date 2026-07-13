## Purpose

Bulk import and export of namespaces and entries via OKVNS YAML format. Supports dual-shape import (plural `namespaces` and single `namespace`) with strict schema validation, atomic validation-before-mutation, deterministic ordering, and canonical export.

## Requirements

### Requirement: YAML import supports multiple namespaces
The system SHALL import YAML content containing one or more namespaces and their entries into durable storage. The canonical accepted shape MUST use a `namespaces` array, and the original single `namespace` shape MUST also be accepted for import compatibility. Clients MUST be able to submit YAML content either as a JSON `yaml` request field or as a multipart file field named `file` on `POST /yaml/import`.

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

### Requirement: YAML import is atomic per request
The system SHALL validate the complete YAML document before applying any imported namespace changes and SHALL commit all valid imported namespaces in a single durable storage transaction.

#### Scenario: Invalid import leaves existing storage unchanged
- **WHEN** a client imports YAML where one namespace is valid and another namespace is invalid
- **THEN** the system rejects the import and leaves existing storage unchanged

#### Scenario: Storage failure leaves existing storage unchanged
- **WHEN** a valid YAML import begins applying namespace changes and durable storage fails before the import commits
- **THEN** the system rejects the import and leaves existing storage unchanged

### Requirement: YAML import upserts namespaces
The system SHALL apply a valid import by replacing each imported namespace's entries when that namespace already exists and creating namespaces that do not exist.

#### Scenario: Existing namespace is replaced by import
- **WHEN** a valid YAML import contains a namespace that already exists
- **THEN** the system replaces that namespace's entries with the imported entries

### Requirement: YAML export uses canonical multiple namespace shape
The system SHALL export namespaces and entries from durable storage as raw YAML using a canonical `namespaces` array shape. The exported YAML MUST NOT be wrapped in a markdown code fence.

#### Scenario: Export all namespaces succeeds
- **WHEN** a client requests a full YAML export from `GET /yaml/export`
- **THEN** the system returns a `yaml` response field containing all current namespaces and entries in deterministic order

#### Scenario: Export selected namespace succeeds
- **WHEN** a client requests YAML export for one existing namespace from `GET /yaml/export/:name`
- **THEN** the system returns a `yaml` response field containing only that namespace and its entries

#### Scenario: Export missing namespace returns not found
- **WHEN** a client requests YAML export for a namespace that does not exist
- **THEN** the system returns a safe namespace not-found error
