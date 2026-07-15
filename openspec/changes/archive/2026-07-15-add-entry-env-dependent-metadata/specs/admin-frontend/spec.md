## MODIFIED Requirements

### Requirement: Admin entry management UI
The React admin frontend SHALL allow admin users to list, create, edit, view, filter, and delete entries within a selected namespace through the OKVNS API, and SHALL display entry description, `env_dependent`, and timestamp metadata returned by list and detail operations.

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
- **THEN** the UI provides a way to show only environment-dependent entries
- **AND** the filtered view identifies entries that require cross-environment adjustment

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

#### Scenario: Description fields are available to components
- **WHEN** the API client receives namespace or entry responses with `description`
- **THEN** it exposes those description fields to frontend components without dropping or renaming them

#### Scenario: Entry env_dependent fields are available to components
- **WHEN** the API client receives entry responses with `env_dependent`
- **THEN** it exposes that boolean field to frontend components without dropping or renaming it
