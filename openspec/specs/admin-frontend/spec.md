## Purpose

React admin frontend for the OKVNS platform. Provides browser-based namespace management, entry management, markdown import, and markdown export through an isolated API client. Backed by React Testing Library tests and Playwright E2E workflows.

## Requirements

### Requirement: Admin namespace management UI
The React admin frontend SHALL allow admin users to list, create, edit, view, and delete namespaces through the OKVNS API.

#### Scenario: Admin creates namespace
- **WHEN** an admin submits a valid namespace creation form
- **THEN** the UI calls the API, shows the created namespace, and clears or resets the form state

#### Scenario: Admin sees namespace validation error
- **WHEN** an admin submits an invalid or duplicate namespace
- **THEN** the UI displays a useful validation or API error without exposing stack traces

### Requirement: Admin entry management UI
The React admin frontend SHALL allow admin users to list, create, edit, view, and delete entries within a selected namespace through the OKVNS API.

#### Scenario: Admin creates entry
- **WHEN** an admin submits a valid entry form for a namespace
- **THEN** the UI calls the API and shows the new entry in that namespace

#### Scenario: Admin deletes entry
- **WHEN** an admin confirms deletion of an existing entry
- **THEN** the UI calls the API and removes the entry from the namespace view

### Requirement: Admin markdown import UI
The React admin frontend SHALL allow admin users to paste or upload markdown content and import namespaces and entries through the OKVNS API.

#### Scenario: Admin imports markdown
- **WHEN** an admin submits valid OKVNS markdown containing multiple namespaces
- **THEN** the UI calls the import API and shows the resulting imported namespaces

#### Scenario: Admin sees import validation error
- **WHEN** an admin submits invalid markdown
- **THEN** the UI displays the API validation error and keeps the submitted content available for correction

### Requirement: Admin markdown export UI
The React admin frontend SHALL allow admin users to export all namespaces or a selected namespace as markdown.

#### Scenario: Admin exports all namespaces
- **WHEN** an admin requests a full export
- **THEN** the UI retrieves markdown from the API and presents it for copy or download

#### Scenario: Admin exports selected namespace
- **WHEN** an admin requests export for one namespace
- **THEN** the UI retrieves markdown containing only that namespace

### Requirement: Frontend API mapping and tests
The React admin frontend SHALL isolate API request/response mapping from components and SHALL cover key UI behavior with Vitest and React Testing Library.

#### Scenario: API error is mapped for display
- **WHEN** the API returns a safe error response
- **THEN** the frontend API client maps it into UI state without relying on transport internals

### Requirement: Initial E2E workflows
The project SHALL include Playwright workflows for namespace CRUD, entry CRUD, markdown import, and markdown export.

#### Scenario: Namespace CRUD workflow is exercised
- **WHEN** the Playwright suite runs against the local app
- **THEN** it creates, lists, updates, and deletes a namespace through the browser UI

#### Scenario: Entry CRUD workflow is exercised
- **WHEN** the Playwright suite runs against the local app
- **THEN** it creates, reads, updates, and deletes an entry within a namespace through the browser UI
