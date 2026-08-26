## MODIFIED Requirements

### Requirement: Admin namespace management UI
The React admin frontend SHALL allow admin users to list, page, order, filter, create, edit, view, and delete namespaces through the OKVNS API, and SHALL display namespace description and timestamp metadata returned by list and detail operations.

#### Scenario: Admin creates namespace
- **WHEN** an admin submits a valid namespace creation form with an optional description
- **THEN** the UI calls the API, shows the created namespace and description when provided, and clears or resets the form state

#### Scenario: Admin updates namespace description
- **WHEN** an admin edits the description for an existing namespace
- **THEN** the UI calls the API and shows the updated description on the namespace detail view

#### Scenario: Admin sees namespace validation error
- **WHEN** an admin submits an invalid or duplicate namespace or an invalid namespace description
- **THEN** the UI displays a useful validation or API error without exposing stack traces

#### Scenario: Admin views namespace timestamps
- **WHEN** an admin views the namespace list or a namespace detail page
- **THEN** the UI displays the namespace `created_at` and `modified_at` values returned by the API

#### Scenario: Admin pages namespaces
- **WHEN** an admin selects a namespace page size of `10`, `50`, or `100` or navigates between namespace pages
- **THEN** the UI requests the selected namespace page from the API
- **AND** the UI displays the current page and available pagination controls from the API metadata

#### Scenario: Admin orders namespaces
- **WHEN** an admin orders namespaces by name, creation date, or modification date
- **THEN** the UI requests namespaces from the API using the selected ordering
- **AND** the displayed namespace list reflects the API-ordered result

#### Scenario: Admin filters namespaces by name
- **WHEN** an admin filters namespaces by name
- **THEN** the UI requests namespaces from the API using the entered name filter
- **AND** the displayed namespace list and pagination metadata reflect the filtered result

### Requirement: Admin entry management UI
The React admin frontend SHALL allow admin users to list, page, order, filter, create, edit, view, and delete entries within a selected namespace through the OKVNS API, and SHALL display entry description, `env_dependent`, and timestamp metadata returned by list and detail operations.

#### Scenario: Admin creates entry
- **WHEN** an admin submits a valid entry form with an optional description and optional environment-dependent marker for a namespace
- **THEN** the UI calls the API and shows the new entry, description, and `env_dependent` state in that namespace

#### Scenario: Admin updates entry description
- **WHEN** an admin edits the description for an existing entry
- **THEN** the UI calls the API and shows the updated description in the namespace detail view

#### Scenario: Admin updates entry env_dependent
- **WHEN** an admin changes the environment-dependent marker for an existing entry
- **THEN** the UI calls the API and shows the updated `env_dependent` state in the namespace detail view

#### Scenario: Admin locates environment-dependent entries
- **WHEN** an admin views a namespace containing entries with `env_dependent` set to `true`
- **THEN** the UI provides a way to show only environment-dependent entries by requesting an API-filtered entry list
- **AND** the filtered view identifies entries that require cross-environment adjustment

#### Scenario: Admin deletes entry
- **WHEN** an admin confirms deletion of an existing entry
- **THEN** the UI calls the API and removes the entry from the namespace view

#### Scenario: Admin views entry timestamps
- **WHEN** an admin views entries in a namespace detail page
- **THEN** the UI displays each entry's `created_at` and `modified_at` values returned by the API

#### Scenario: Admin pages entries
- **WHEN** an admin selects an entry page size of `10`, `50`, or `100` or navigates between entry pages
- **THEN** the UI requests the selected entry page from the API
- **AND** the UI displays the current page and available pagination controls from the API metadata

#### Scenario: Admin orders entries
- **WHEN** an admin orders entries by name, creation date, modification date, or environment-dependence
- **THEN** the UI requests entries from the API using the selected ordering
- **AND** the displayed entry list reflects the API-ordered result

#### Scenario: Admin filters entries by name
- **WHEN** an admin filters entries by name
- **THEN** the UI requests entries from the API using the entered name filter
- **AND** the displayed entry list and pagination metadata reflect the filtered result

### Requirement: Frontend API mapping and tests
The React admin frontend SHALL isolate API request/response mapping from components and SHALL cover key UI behavior with Vitest and React Testing Library.

#### Scenario: API error is mapped for display
- **WHEN** the API returns a safe error response
- **THEN** the frontend API client maps it into UI state without relying on transport internals

#### Scenario: Timestamp fields are available to components
- **WHEN** the API client receives namespace or entry responses with `created_at` and `modified_at`
- **THEN** it exposes those timestamp fields to frontend components without dropping or renaming them

#### Scenario: Description fields are available to components
- **WHEN** the API client receives namespace or entry responses with `description`
- **THEN** it exposes those description fields to frontend components without dropping or renaming them

#### Scenario: Entry env_dependent fields are available to components
- **WHEN** the API client receives entry responses with `env_dependent`
- **THEN** it exposes that boolean field to frontend components without dropping or renaming it

#### Scenario: Paginated list responses are available to components
- **WHEN** the API client receives namespace or entry list responses with `items`, `page`, `page_size`, `total_items`, and `total_pages`
- **THEN** it exposes the list items and pagination metadata to frontend components without dropping or renaming them

#### Scenario: Namespace list items are exposed without entries
- **WHEN** the API client receives a paginated namespace list response
- **THEN** it exposes lightweight namespace list items without an `entries` array
- **AND** entry collections are read through namespace detail or paginated entry list calls

### Requirement: Initial E2E workflows
The project SHALL include Playwright workflows for namespace CRUD, entry CRUD, YAML import, YAML export, and API-backed list controls.

#### Scenario: Namespace CRUD workflow is exercised
- **WHEN** the Playwright suite runs against the local app
- **THEN** it creates, lists, updates, and deletes a namespace through the browser UI, including namespace description changes

#### Scenario: Entry CRUD workflow is exercised
- **WHEN** the Playwright suite runs against the local app
- **THEN** it creates, reads, updates, and deletes an entry within a namespace through the browser UI, including entry description changes

#### Scenario: YAML import workflow is exercised
- **WHEN** the Playwright suite runs against the local app
- **THEN** it imports namespaces and entries through the browser pasted YAML import UI and uploaded YAML file import UI

#### Scenario: YAML export workflow is exercised
- **WHEN** the Playwright suite runs against the local app
- **THEN** it exports all namespaces and a selected namespace through the browser YAML export UI

#### Scenario: List controls workflow is exercised
- **WHEN** the Playwright suite runs against the local app
- **THEN** it verifies API-backed namespace and entry page size, ordering, and filtering controls through the browser UI
