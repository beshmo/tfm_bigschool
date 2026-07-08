## ADDED Requirements

### Requirement: Entry creation within namespace
The system SHALL allow API clients and admin users to create an entry with a valid unique name inside an existing namespace.

#### Scenario: Create entry succeeds
- **WHEN** a client submits a valid entry name and value for an existing namespace
- **THEN** the system stores the entry inside that namespace and returns it with a successful status

#### Scenario: Duplicate entry is rejected
- **WHEN** a client submits an entry name already used in the target namespace
- **THEN** the system returns a duplicate entry error without changing the existing entry

#### Scenario: Create entry in missing namespace is rejected
- **WHEN** a client creates an entry for a namespace that does not exist
- **THEN** the system returns a safe namespace not-found error

### Requirement: Entry listing within namespace
The system SHALL allow API clients and admin users to list entries for a namespace.

#### Scenario: List entries returns namespace entries
- **WHEN** a namespace contains entries
- **THEN** the system returns that namespace's entries in a deterministic order

### Requirement: Entry retrieval within namespace
The system SHALL allow API clients and admin users to retrieve an entry by namespace name and entry name.

#### Scenario: Existing entry is returned
- **WHEN** a client requests an existing entry in an existing namespace
- **THEN** the system returns that entry

#### Scenario: Missing entry returns not found
- **WHEN** a client requests an entry that does not exist in the namespace
- **THEN** the system returns a safe entry not-found error

### Requirement: Entry update within namespace
The system SHALL allow API clients and admin users to update an entry name, value, or both within an existing namespace.

#### Scenario: Update entry succeeds
- **WHEN** a client updates an existing entry with valid data
- **THEN** the system stores the updated entry in the same namespace

#### Scenario: Update entry to duplicate name is rejected
- **WHEN** a client renames an entry to a name already used by another entry in the namespace
- **THEN** the system returns a duplicate entry error without changing either entry

### Requirement: Entry deletion within namespace
The system SHALL allow API clients and admin users to delete an entry from a namespace.

#### Scenario: Delete entry succeeds
- **WHEN** a client deletes an existing entry from a namespace
- **THEN** the entry is no longer available and the namespace remains available

#### Scenario: Delete missing entry returns not found
- **WHEN** a client deletes an entry that does not exist in the namespace
- **THEN** the system returns a safe entry not-found error

### Requirement: Entry API contract
The API SHALL expose entry endpoints with validated DTOs, safe error response shapes, and no stack traces or implementation details in responses.

#### Scenario: Invalid entry request is rejected at boundary
- **WHEN** a client sends an invalid entry request body or route parameter
- **THEN** the API returns a validation error before executing the use case
