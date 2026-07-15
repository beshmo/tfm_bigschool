## MODIFIED Requirements

### Requirement: Entry creation within namespace
The system SHALL allow API clients and admin users to create an entry with a valid unique name, value, optional description, and optional `env_dependent` boolean inside an existing namespace, storing the entry in durable storage and returning entry timestamp metadata.

#### Scenario: Create entry succeeds
- **WHEN** a client submits a valid entry name, value, optional valid description, and optional `env_dependent` value for an existing namespace
- **THEN** the system stores the entry inside that namespace and returns it with a successful status
- **AND** the response includes the entry `description` when one was provided
- **AND** the response includes the entry `env_dependent` boolean
- **AND** the response includes `created_at` and `modified_at` date-time strings for the entry

#### Scenario: Entry env_dependent defaults to false
- **WHEN** a client creates an entry without an `env_dependent` value
- **THEN** the system stores the entry with `env_dependent` set to `false`
- **AND** the response includes `env_dependent` set to `false`

#### Scenario: Blank entry description is normalized
- **WHEN** a client creates an entry with a blank or whitespace-only description
- **THEN** the system stores the entry without a description

#### Scenario: Duplicate entry is rejected
- **WHEN** a client submits an entry name already used in the target namespace
- **THEN** the system returns a duplicate entry error without changing the existing entry

#### Scenario: Create entry in missing namespace is rejected
- **WHEN** a client creates an entry for a namespace that does not exist
- **THEN** the system returns a safe namespace not-found error

### Requirement: Entry listing within namespace
The system SHALL allow API clients and admin users to list entries for a namespace, including entry description, `env_dependent`, and timestamp metadata.

#### Scenario: List entries returns namespace entries
- **WHEN** a namespace contains entries
- **THEN** the system returns that namespace's entries in a deterministic order
- **AND** each entry includes `description` when one is stored
- **AND** each entry includes `env_dependent` as a boolean
- **AND** each entry includes `created_at` and `modified_at` date-time strings

### Requirement: Entry retrieval within namespace
The system SHALL allow API clients and admin users to retrieve an entry by namespace name and entry name, including entry description, `env_dependent`, and timestamp metadata.

#### Scenario: Existing entry is returned
- **WHEN** a client requests an existing entry in an existing namespace
- **THEN** the system returns that entry
- **AND** the entry includes `description` when one is stored
- **AND** the entry includes `env_dependent` as a boolean
- **AND** the entry includes `created_at` and `modified_at` date-time strings

#### Scenario: Missing entry returns not found
- **WHEN** a client requests an entry that does not exist in the namespace
- **THEN** the system returns a safe entry not-found error

### Requirement: Entry update within namespace
The system SHALL allow API clients and admin users to update an entry name, value, description, `env_dependent`, or any combination within an existing namespace, committing the update to durable storage and updating entry modification metadata.

#### Scenario: Update entry succeeds
- **WHEN** a client updates an existing entry with valid data
- **THEN** the system stores the updated entry in the same namespace
- **AND** the entry `created_at` remains unchanged
- **AND** the entry `modified_at` reflects the update

#### Scenario: Update entry description succeeds
- **WHEN** a client updates only the description for an existing entry with a valid optional description
- **THEN** the system stores the updated description with the existing entry name and value
- **AND** the entry `created_at` remains unchanged
- **AND** the entry `modified_at` reflects the description change
- **AND** the namespace `modified_at` reflects that an entry changed

#### Scenario: Update entry env_dependent succeeds
- **WHEN** a client updates only `env_dependent` for an existing entry with a boolean value
- **THEN** the system stores the updated `env_dependent` value with the existing entry name, value, and description
- **AND** the entry `created_at` remains unchanged
- **AND** the entry `modified_at` reflects the metadata change
- **AND** the namespace `modified_at` reflects that an entry changed

#### Scenario: Clear entry description succeeds
- **WHEN** a client updates an existing entry description to a blank or whitespace-only value
- **THEN** the system stores the entry without a description
- **AND** the entry `modified_at` reflects the description change

#### Scenario: Update entry to duplicate name is rejected
- **WHEN** a client renames an entry to a name already used by another entry in the namespace
- **THEN** the system returns a duplicate entry error without changing either entry

#### Scenario: Failed entry update leaves entry unchanged
- **WHEN** an entry update cannot be committed to durable storage
- **THEN** the original entry remains available unchanged

### Requirement: Entry API contract
The API SHALL expose entry endpoints with validated DTOs, safe error response shapes, and no stack traces or implementation details in responses.

#### Scenario: Invalid entry request is rejected at boundary
- **WHEN** a client sends an invalid entry request body or route parameter
- **THEN** the API returns a validation error before executing the use case

#### Scenario: Oversized entry description is rejected at boundary
- **WHEN** a client sends an entry description longer than 1000 characters
- **THEN** the API returns a validation error before executing the use case

#### Scenario: Entry description must be a string
- **WHEN** a client sends an entry description that is not a string
- **THEN** the API returns a validation error before executing the use case

#### Scenario: Entry env_dependent must be a boolean
- **WHEN** a client sends an `env_dependent` value that is not a boolean
- **THEN** the API returns a validation error before executing the use case

### Requirement: In-memory entry timestamp metadata
The in-memory repository SHALL assign and preserve entry timestamp metadata during write operations.

#### Scenario: In-memory entry writes receive timestamps
- **WHEN** the in-memory repository saves a namespace containing new or changed entries
- **THEN** entries returned by list and retrieval operations include `created_at` and `modified_at` date-time strings

#### Scenario: In-memory entry creation timestamp is stable across updates
- **WHEN** an existing entry is updated in the in-memory repository
- **THEN** the entry `created_at` remains unchanged
- **AND** the entry `modified_at` reflects the update

#### Scenario: In-memory entry description changes update timestamps
- **WHEN** an existing entry description is updated in the in-memory repository
- **THEN** the entry `created_at` remains unchanged
- **AND** the entry `modified_at` reflects the description update

#### Scenario: In-memory entry env_dependent changes update timestamps
- **WHEN** an existing entry `env_dependent` value is updated in the in-memory repository
- **THEN** the entry `created_at` remains unchanged
- **AND** the entry `modified_at` reflects the metadata update
