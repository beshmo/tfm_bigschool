## MODIFIED Requirements

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
