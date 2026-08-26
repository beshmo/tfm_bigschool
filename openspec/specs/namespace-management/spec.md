## Purpose

Namespace CRUD operations exposed through the REST API and admin frontend. Covers creation, listing, retrieval, rename, description updates, and deletion with validated inputs and safe error responses.

## Requirements

### Requirement: Namespace creation
The system SHALL allow API clients and admin users to create a namespace with a valid unique name and optional description, and SHALL return namespace timestamp metadata.

#### Scenario: Create namespace succeeds
- **WHEN** a client submits a valid namespace name and optional valid description that does not already exist
- **THEN** the system stores the namespace and returns it with a successful status
- **AND** the response includes the namespace `description` when one was provided
- **AND** the response includes `created_at` and `modified_at` date-time strings for the namespace

#### Scenario: Blank namespace description is normalized
- **WHEN** a client creates a namespace with a blank or whitespace-only description
- **THEN** the system stores the namespace without a description

#### Scenario: Duplicate namespace is rejected
- **WHEN** a client submits a namespace name that already exists after normalization
- **THEN** the system returns a duplicate namespace error without changing the existing namespace

### Requirement: Namespace listing
The system SHALL allow API clients and admin users to list namespaces currently stored in durable storage as a paginated result, including namespace description and timestamp metadata. Namespace list items MUST be lightweight summaries and MUST NOT include the full `entries` array.

#### Scenario: List namespaces returns a paginated result
- **WHEN** namespaces exist in durable storage
- **THEN** the system returns a paginated namespace result with `items`, `page`, `page_size`, `total_items`, and `total_pages`
- **AND** each namespace item includes `description` when one is stored
- **AND** each namespace item includes `created_at` and `modified_at` date-time strings
- **AND** namespace items do not include `entries`

#### Scenario: Namespace list does not carry entries
- **WHEN** a namespace contains one or more entries
- **THEN** the namespace list endpoint returns that namespace as a list item without an `entries` array
- **AND** clients can read entries from the namespace detail endpoint or the paginated entry list endpoint

#### Scenario: List namespaces supports page size choices
- **WHEN** a client lists namespaces with `page_size` set to `10`, `50`, or `100`
- **THEN** the system returns at most that many namespace items for the requested page
- **AND** the pagination metadata reflects the selected page size

#### Scenario: List namespaces rejects unsupported page size
- **WHEN** a client lists namespaces with a `page_size` other than `10`, `50`, or `100`
- **THEN** the API returns a validation error before executing the list query

#### Scenario: List namespaces orders by supported fields
- **WHEN** a client lists namespaces ordered by `name`, `created_at`, or `modified_at` in ascending or descending direction
- **THEN** the system returns the selected page using that ordering
- **AND** rows with equal primary sort values are ordered deterministically by namespace name

#### Scenario: List namespaces filters by name
- **WHEN** a client lists namespaces with a name filter
- **THEN** the system returns only namespace items whose names contain the filter text
- **AND** pagination metadata describes the filtered result set

### Requirement: Namespace retrieval
The system SHALL allow API clients and admin users to retrieve a namespace by name, including namespace description metadata and namespace and entry timestamp metadata.

#### Scenario: Existing namespace is returned
- **WHEN** a client requests an existing namespace by name
- **THEN** the system returns that namespace and its entries
- **AND** the namespace includes `description` when one is stored
- **AND** each entry includes `description` when one is stored
- **AND** the namespace includes `created_at` and `modified_at` date-time strings
- **AND** each entry includes `created_at` and `modified_at` date-time strings

#### Scenario: Missing namespace returns not found
- **WHEN** a client requests a namespace name that does not exist
- **THEN** the system returns a safe not-found error

### Requirement: Namespace update
The system SHALL allow API clients and admin users to update a namespace name, description, or both while preserving its entries and updating namespace-level modification metadata.

#### Scenario: Rename namespace succeeds
- **WHEN** a client renames an existing namespace to a valid unused name
- **THEN** the system stores the new namespace name with the existing entries and description
- **AND** the namespace `created_at` remains unchanged
- **AND** the namespace `modified_at` reflects the rename as a namespace-level change

#### Scenario: Update namespace description succeeds
- **WHEN** a client updates the description for an existing namespace with a valid optional description
- **THEN** the system stores the updated description with the existing namespace name and entries
- **AND** the namespace `created_at` remains unchanged
- **AND** the namespace `modified_at` reflects the description change as a namespace-level change

#### Scenario: Clear namespace description succeeds
- **WHEN** a client updates an existing namespace description to a blank or whitespace-only value
- **THEN** the system stores the namespace without a description
- **AND** the namespace `modified_at` reflects the description change

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

#### Scenario: Oversized namespace description is rejected at boundary
- **WHEN** a client sends a namespace description longer than 1000 characters
- **THEN** the API returns a validation error before executing the use case

#### Scenario: Namespace description must be a string
- **WHEN** a client sends a namespace description that is not a string
- **THEN** the API returns a validation error before executing the use case

### Requirement: Namespace modification timestamp semantics
The system SHALL treat namespace `modified_at` as the last namespace-level change or entry mutation inside that namespace.

#### Scenario: Entry changes update namespace modification timestamp
- **WHEN** a client creates, updates, or deletes an entry inside an existing namespace
- **THEN** the namespace `modified_at` changes to reflect that the namespace contents changed

#### Scenario: Namespace description changes update namespace modification timestamp
- **WHEN** a client updates the description of an existing namespace
- **THEN** the namespace `modified_at` changes to reflect the namespace-level description change

#### Scenario: In-memory namespace writes receive timestamps
- **WHEN** the in-memory repository creates, saves, renames, or imports a namespace
- **THEN** it assigns current timestamp values needed to return `created_at` and aggregate namespace `modified_at` consistently with the API contract
