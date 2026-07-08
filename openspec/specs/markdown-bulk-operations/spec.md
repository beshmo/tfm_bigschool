## Purpose

Bulk import and export of namespaces and entries via OKVNS markdown format. Supports dual-shape import (plural `namespaces` and single `namespace`) with strict schema validation, atomic validation-before-mutation, deterministic ordering, and canonical export.

## Requirements

### Requirement: Markdown import supports multiple namespaces
The system SHALL import markdown content containing one or more namespaces and their entries. The canonical accepted shape MUST use a `namespaces` array, and the original single `namespace` shape MUST also be accepted for import compatibility.

#### Scenario: Import multiple namespaces succeeds
- **WHEN** a client imports valid markdown with a `namespaces` array containing multiple namespace definitions
- **THEN** the system stores all namespaces and entries from the file

#### Scenario: Import single namespace shape succeeds
- **WHEN** a client imports valid markdown with a single `namespace` object
- **THEN** the system stores that namespace and its entries

### Requirement: Markdown import validates schema strictly
The markdown importer MUST allow only the expected OKVNS keys and MUST reject invalid shapes, unexpected keys, duplicate namespaces, duplicate entries, invalid names, non-string values, and payloads over the configured size limit.

#### Scenario: Unexpected key is rejected
- **WHEN** imported markdown contains a key outside the OKVNS allowlist
- **THEN** the system returns a validation error without mutating storage

#### Scenario: Duplicate namespace in file is rejected
- **WHEN** imported markdown contains the same namespace name more than once after normalization
- **THEN** the system returns a duplicate namespace error without mutating storage

#### Scenario: Duplicate entry in imported namespace is rejected
- **WHEN** imported markdown contains duplicate entry names in the same namespace after normalization
- **THEN** the system returns a duplicate entry error without mutating storage

### Requirement: Markdown import is atomic per request
The system SHALL validate the complete markdown document before applying any imported namespace changes.

#### Scenario: Invalid import leaves existing storage unchanged
- **WHEN** a client imports markdown where one namespace is valid and another namespace is invalid
- **THEN** the system rejects the import and leaves existing storage unchanged

### Requirement: Markdown import upserts namespaces
The system SHALL apply a valid import by replacing each imported namespace's entries when that namespace already exists and creating namespaces that do not exist.

#### Scenario: Existing namespace is replaced by import
- **WHEN** a valid import contains a namespace that already exists
- **THEN** the system replaces that namespace's entries with the imported entries

### Requirement: Markdown export uses canonical multiple namespace shape
The system SHALL export namespaces and entries as markdown using a canonical `namespaces` array shape.

#### Scenario: Export all namespaces succeeds
- **WHEN** a client requests a full markdown export
- **THEN** the system returns markdown containing all current namespaces and entries in deterministic order

#### Scenario: Export selected namespace succeeds
- **WHEN** a client requests markdown export for one existing namespace
- **THEN** the system returns markdown containing only that namespace and its entries

#### Scenario: Export missing namespace returns not found
- **WHEN** a client requests markdown export for a namespace that does not exist
- **THEN** the system returns a safe namespace not-found error
