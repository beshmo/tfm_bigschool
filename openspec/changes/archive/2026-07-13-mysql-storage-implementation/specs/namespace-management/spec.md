## MODIFIED Requirements

### Requirement: Namespace listing
The system SHALL allow API clients and admin users to list all namespaces currently stored in durable storage.

#### Scenario: List namespaces returns current namespaces
- **WHEN** namespaces exist in durable storage
- **THEN** the system returns all current namespaces in a deterministic order

### Requirement: Namespace update
The system SHALL allow API clients and admin users to update a namespace name while preserving its entries.

#### Scenario: Rename namespace succeeds
- **WHEN** a client renames an existing namespace to a valid unused name
- **THEN** the system stores the new namespace name with the existing entries

#### Scenario: Rename namespace to duplicate is rejected
- **WHEN** a client renames a namespace to a name already used by another namespace
- **THEN** the system returns a duplicate namespace error without changing either namespace

#### Scenario: Failed rename leaves namespace unchanged
- **WHEN** a namespace rename cannot be committed to durable storage
- **THEN** the system leaves the original namespace and entries unchanged

