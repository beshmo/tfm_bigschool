## Purpose

React admin frontend for the OKVNS platform. Provides browser-based namespace management, entry management, YAML import, and YAML export through an isolated API client. Backed by React Testing Library tests and Playwright E2E workflows.

## Requirements

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

### Requirement: Admin UI structure inventory
The admin frontend SHALL keep the structure below so the UI can be rebuilt from this spec. Visual tokens are owned by `apps/admin-web/src/styles.css` (the vendored Industry design system) and are vendored for reference in `docs/design-tokens.css` (guarded against drift by a test) and explained in `docs/design-system.md`: every color, font, spacing, radius and shadow comes from a `--color-*`, `--font-*` (`--font-heading`, `--font-body`, `--font-heading-weight`), `--space-*` (1, 2, 3, 4, 6, 8), `--radius-*` (sm, md, lg) or `--shadow-*` (sm, md, lg) variable.

#### Scenario: Routes and shell
- **WHEN** the app renders
- **THEN** a header nav shows the brand "OKVNS Admin" (`brackets` icon) and links **Namespaces** (`/`), **Import** (`/import`), **Export** (`/export`), with the active link marked `aria-current="page"`
- **AND** the routes are `/` (NamespacesPage), `/namespaces/:name` (NamespaceDetailPage), `/import` (ImportPage), and `/export` (ExportPage)
- **AND** a footer shows the brand and `v<version>` read from the admin package version at build time

#### Scenario: List control defaults
- **WHEN** a namespace or entry list first loads
- **THEN** it requests page 1, page size 10 (choices 10, 50, 100), sorted by name ascending
- **AND** namespaces offer the ordering fields Name, Created, Modified, and entries additionally offer Environment-dependent
- **AND** the controls are labelled "Filter by name", "Order by", "Direction" (Ascending/Descending) and "Per page"
- **AND** every control change immediately re-requests the list from the API, without debounce and without local filtering

#### Scenario: Loading, empty and error states
- **WHEN** a list is loading
- **THEN** a skeleton with the real table headers and four placeholder rows is shown next to a "Loading…" status
- **AND** an empty namespace list reads "No namespaces yet." with the hint "Create one above to get started.", or "No namespaces match the filter." when a name filter is active
- **AND** failures render in an error banner beside the form that caused them, not as toasts

#### Scenario: Toasts and dialogs
- **WHEN** a write succeeds
- **THEN** a corner toast (`checkCircle` icon) confirms it for 6 seconds unless dismissed, for example "Namespace created", "Namespace deleted", "Entry added", "Changes saved", "Import complete"
- **AND** deleting a namespace or entry opens a `role="alertdialog"` titled "Delete namespace?" or "Delete entry?" with a "Delete" confirm button, which closes on Escape, focuses on open, and returns focus to its opener
- **AND** deleting the last item on a page navigates to the previous page

#### Scenario: Icons and timestamps
- **WHEN** an icon is rendered
- **THEN** it is one of the inlined Lucide icons at stroke-width 1.5 in `components/Icon.tsx`: `brackets`, `trash`, `pencil`, `chevronLeft`, `chevronRight`, `arrowLeft`, `alertTriangle`, `checkCircle`, `close`, `upload`, `download`, `copy`
- **AND** timestamps render through `components/Timestamps.tsx`, pinned to `en-US`/UTC, with `<time dateTime>` holding the API's ISO instant

#### Scenario: Page composition
- **WHEN** the namespaces page renders
- **THEN** it shows the "Namespaces" heading, a "Create namespace" form, list controls, the table, and pagination
- **AND** the namespace detail page shows the namespace name, "Namespace settings" (rename and description), an "Add entry" form, and an "Entries" list with an entry edit dialog
- **AND** the import page ("Import YAML") offers "Paste YAML" and "Import a file" sections plus an "Imported namespaces" result
- **AND** the export page pages through all namespaces at page size 100 sorted by name to offer export of all or a single namespace

#### Scenario: Runtime API base URL
- **WHEN** the app resolves the API base URL
- **THEN** it uses `window.__OKVNS_API_BASE_URL__` first, then `VITE_OKVNS_API_BASE_URL`, then `http://localhost:3000`
