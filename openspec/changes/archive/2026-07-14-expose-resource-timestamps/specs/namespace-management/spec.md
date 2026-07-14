## MODIFIED Requirements

### Requirement: Namespace creation
The system SHALL allow API clients and admin users to create a namespace with a valid unique name, and SHALL return namespace timestamp metadata.

#### Scenario: Create namespace succeeds
- **WHEN** a client submits a valid namespace name that does not already exist
- **THEN** the system stores the namespace and returns it with a successful status
- **AND** the response includes `created_at` and `modified_at` date-time strings for the namespace

#### Scenario: Duplicate namespace is rejected
- **WHEN** a client submits a namespace name that already exists after normalization
- **THEN** the system returns a duplicate namespace error without changing the existing namespace

### Requirement: Namespace listing
The system SHALL allow API clients and admin users to list all namespaces currently stored in durable storage, including namespace timestamp metadata.

#### Scenario: List namespaces returns current namespaces
- **WHEN** namespaces exist in durable storage
- **THEN** the system returns all current namespaces in a deterministic order
- **AND** each namespace includes `created_at` and `modified_at` date-time strings

### Requirement: Namespace retrieval
The system SHALL allow API clients and admin users to retrieve a namespace by name, including namespace and entry timestamp metadata.

#### Scenario: Existing namespace is returned
- **WHEN** a client requests an existing namespace by name
- **THEN** the system returns that namespace and its entries
- **AND** the namespace includes `created_at` and `modified_at` date-time strings
- **AND** each entry includes `created_at` and `modified_at` date-time strings

#### Scenario: Missing namespace returns not found
- **WHEN** a client requests a namespace name that does not exist
- **THEN** the system returns a safe not-found error

### Requirement: Namespace update
The system SHALL allow API clients and admin users to update a namespace name while preserving its entries and updating namespace-level modification metadata.

#### Scenario: Rename namespace succeeds
- **WHEN** a client renames an existing namespace to a valid unused name
- **THEN** the system stores the new namespace name with the existing entries
- **AND** the namespace `created_at` remains unchanged
- **AND** the namespace `modified_at` reflects the rename as a namespace-level change

#### Scenario: Rename namespace to duplicate is rejected
- **WHEN** a client renames a namespace to a name already used by another namespace
- **THEN** the system returns a duplicate namespace error without changing either namespace

#### Scenario: Failed rename leaves namespace unchanged
- **WHEN** a namespace rename cannot be committed to durable storage
- **THEN** the system leaves the original namespace and entries unchanged

## ADDED Requirements

### Requirement: Namespace modification timestamp semantics
The system SHALL treat namespace `modified_at` as the last namespace-level change or entry mutation inside that namespace.

#### Scenario: Entry changes update namespace modification timestamp
- **WHEN** a client creates, updates, or deletes an entry inside an existing namespace
- **THEN** the namespace `modified_at` changes to reflect that the namespace contents changed

#### Scenario: In-memory namespace writes receive timestamps
- **WHEN** the in-memory repository creates, saves, renames, or imports a namespace
- **THEN** it assigns current timestamp values needed to return `created_at` and aggregate namespace `modified_at` consistently with the API contract
