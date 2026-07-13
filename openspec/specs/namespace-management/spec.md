## Purpose

Namespace CRUD operations exposed through the REST API and admin frontend. Covers creation, listing, retrieval, rename, and deletion with validated inputs and safe error responses.

## Requirements

### Requirement: Namespace creation
The system SHALL allow API clients and admin users to create a namespace with a valid unique name.

#### Scenario: Create namespace succeeds
- **WHEN** a client submits a valid namespace name that does not already exist
- **THEN** the system stores the namespace and returns it with a successful status

#### Scenario: Duplicate namespace is rejected
- **WHEN** a client submits a namespace name that already exists after normalization
- **THEN** the system returns a duplicate namespace error without changing the existing namespace

### Requirement: Namespace listing
The system SHALL allow API clients and admin users to list all namespaces currently stored in durable storage.

#### Scenario: List namespaces returns current namespaces
- **WHEN** namespaces exist in durable storage
- **THEN** the system returns all current namespaces in a deterministic order

### Requirement: Namespace retrieval
The system SHALL allow API clients and admin users to retrieve a namespace by name.

#### Scenario: Existing namespace is returned
- **WHEN** a client requests an existing namespace by name
- **THEN** the system returns that namespace and its entries

#### Scenario: Missing namespace returns not found
- **WHEN** a client requests a namespace name that does not exist
- **THEN** the system returns a safe not-found error

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

### Requirement: Namespace deletion
The system SHALL allow API clients and admin users to delete a namespace and all entries inside it.

#### Scenario: Delete namespace succeeds
- **WHEN** a client deletes an existing namespace
- **THEN** the namespace and its entries are no longer available

#### Scenario: Delete missing namespace returns not found
- **WHEN** a client deletes a namespace that does not exist
- **THEN** the system returns a safe not-found error

### Requirement: Namespace API contract
The API SHALL expose namespace endpoints with validated DTOs, safe error response shapes, and no stack traces or implementation details in responses.

#### Scenario: Invalid namespace request is rejected at boundary
- **WHEN** a client sends an invalid namespace request body or route parameter
- **THEN** the API returns a validation error before executing the use case
