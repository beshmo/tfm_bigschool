## Purpose

React admin frontend for the OKVNS platform. Provides browser-based namespace management, entry management, YAML import, and YAML export through an isolated API client. Backed by React Testing Library tests and Playwright E2E workflows.

## Requirements

### Requirement: Admin namespace management UI
The React admin frontend SHALL allow admin users to list, create, edit, view, and delete namespaces through the OKVNS API, and SHALL display namespace description and timestamp metadata returned by list and detail operations.

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

### Requirement: Admin YAML import UI
The React admin frontend SHALL allow admin users to paste YAML content or upload a YAML file and import namespaces and entries through the OKVNS API. Pasted YAML MUST be submitted through the JSON `yaml` request field. Uploaded YAML files MUST be submitted directly as `multipart/form-data` using a single file field named `file`.

#### Scenario: Admin imports pasted YAML
- **WHEN** an admin submits valid pasted OKVNS YAML containing multiple namespaces
- **THEN** the UI calls the YAML import API using the JSON `yaml` request field
- **AND** the UI shows the resulting imported namespaces

#### Scenario: Admin imports uploaded YAML file
- **WHEN** an admin selects a valid UTF-8 YAML file and submits the upload import action
- **THEN** the UI calls the YAML import API using multipart field `file`
- **AND** the UI shows the resulting imported namespaces

#### Scenario: Admin sees pasted import validation error
- **WHEN** an admin submits invalid pasted YAML
- **THEN** the UI displays the API validation error and keeps the submitted content available for correction

#### Scenario: Admin sees uploaded import validation error
- **WHEN** an admin uploads invalid YAML content
- **THEN** the UI displays the API validation error without exposing transport internals

### Requirement: Admin YAML export UI
The React admin frontend SHALL allow admin users to export all namespaces or a selected namespace as YAML.

#### Scenario: Admin exports all namespaces
- **WHEN** an admin requests a full YAML export
- **THEN** the UI retrieves YAML from the API and presents it for copy or download as a `.yaml` file

#### Scenario: Admin exports selected namespace
- **WHEN** an admin requests YAML export for one namespace
- **THEN** the UI retrieves YAML containing only that namespace

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

### Requirement: Initial E2E workflows
The project SHALL include Playwright workflows for namespace CRUD, entry CRUD, YAML import, and YAML export.

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
