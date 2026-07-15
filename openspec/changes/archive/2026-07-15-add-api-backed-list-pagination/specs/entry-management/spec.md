## MODIFIED Requirements

### Requirement: Entry listing within namespace
The system SHALL allow API clients and admin users to list entries for a namespace as a paginated result, including entry description, `env_dependent`, and timestamp metadata.

#### Scenario: List entries returns a paginated result
- **WHEN** a namespace contains entries
- **THEN** the system returns a paginated entry result with `items`, `page`, `page_size`, `total_items`, and `total_pages`
- **AND** each entry item includes `description` when one is stored
- **AND** each entry item includes `env_dependent` as a boolean
- **AND** each entry item includes `created_at` and `modified_at` date-time strings

#### Scenario: List entries supports page size choices
- **WHEN** a client lists entries with `page_size` set to `10`, `50`, or `100`
- **THEN** the system returns at most that many entry items for the requested page
- **AND** the pagination metadata reflects the selected page size

#### Scenario: List entries rejects unsupported page size
- **WHEN** a client lists entries with a `page_size` other than `10`, `50`, or `100`
- **THEN** the API returns a validation error before executing the list query

#### Scenario: List entries orders by supported fields
- **WHEN** a client lists entries ordered by `name`, `created_at`, `modified_at`, or `env_dependent` in ascending or descending direction
- **THEN** the system returns the selected page using that ordering
- **AND** rows with equal primary sort values are ordered deterministically by entry name

#### Scenario: List entries filters by name
- **WHEN** a client lists entries with a name filter
- **THEN** the system returns only entry items whose names contain the filter text
- **AND** pagination metadata describes the filtered result set

#### Scenario: List entries filters by environment-dependence
- **WHEN** a client lists entries with `env_dependent` set to `true` or `false`
- **THEN** the system returns only entries whose environment-dependence marker matches the requested value
- **AND** pagination metadata describes the filtered result set

#### Scenario: List entries for missing namespace is rejected
- **WHEN** a client lists entries for a namespace that does not exist
- **THEN** the system returns a safe namespace not-found error
