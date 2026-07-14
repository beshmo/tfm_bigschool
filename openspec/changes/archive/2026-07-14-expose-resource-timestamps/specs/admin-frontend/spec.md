## MODIFIED Requirements

### Requirement: Admin namespace management UI
The React admin frontend SHALL allow admin users to list, create, edit, view, and delete namespaces through the OKVNS API, and SHALL display namespace timestamp metadata returned by list and detail operations.

#### Scenario: Admin creates namespace
- **WHEN** an admin submits a valid namespace creation form
- **THEN** the UI calls the API, shows the created namespace, and clears or resets the form state

#### Scenario: Admin sees namespace validation error
- **WHEN** an admin submits an invalid or duplicate namespace
- **THEN** the UI displays a useful validation or API error without exposing stack traces

#### Scenario: Admin views namespace timestamps
- **WHEN** an admin views the namespace list or a namespace detail page
- **THEN** the UI displays the namespace `created_at` and `modified_at` values returned by the API

### Requirement: Admin entry management UI
The React admin frontend SHALL allow admin users to list, create, edit, view, and delete entries within a selected namespace through the OKVNS API, and SHALL display entry timestamp metadata returned by list and detail operations.

#### Scenario: Admin creates entry
- **WHEN** an admin submits a valid entry form for a namespace
- **THEN** the UI calls the API and shows the new entry in that namespace

#### Scenario: Admin deletes entry
- **WHEN** an admin confirms deletion of an existing entry
- **THEN** the UI calls the API and removes the entry from the namespace view

#### Scenario: Admin views entry timestamps
- **WHEN** an admin views entries in a namespace detail page
- **THEN** the UI displays each entry's `created_at` and `modified_at` values returned by the API

### Requirement: Frontend API mapping and tests
The React admin frontend SHALL isolate API request/response mapping from components and SHALL cover key UI behavior with Vitest and React Testing Library.

#### Scenario: API error is mapped for display
- **WHEN** the API returns a safe error response
- **THEN** the frontend API client maps it into UI state without relying on transport internals

#### Scenario: Timestamp fields are available to components
- **WHEN** the API client receives namespace or entry responses with `created_at` and `modified_at`
- **THEN** it exposes those timestamp fields to frontend components without dropping or renaming them
