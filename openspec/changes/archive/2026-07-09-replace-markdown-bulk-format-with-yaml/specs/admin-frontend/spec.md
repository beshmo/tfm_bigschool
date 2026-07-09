## ADDED Requirements

### Requirement: Admin YAML import UI
The React admin frontend SHALL allow admin users to paste or upload YAML content and import namespaces and entries through the OKVNS API.

#### Scenario: Admin imports YAML
- **WHEN** an admin submits valid OKVNS YAML containing multiple namespaces
- **THEN** the UI calls the YAML import API and shows the resulting imported namespaces

#### Scenario: Admin sees import validation error
- **WHEN** an admin submits invalid YAML
- **THEN** the UI displays the API validation error and keeps the submitted content available for correction

### Requirement: Admin YAML export UI
The React admin frontend SHALL allow admin users to export all namespaces or a selected namespace as YAML.

#### Scenario: Admin exports all namespaces
- **WHEN** an admin requests a full YAML export
- **THEN** the UI retrieves YAML from the API and presents it for copy or download as a `.yaml` file

#### Scenario: Admin exports selected namespace
- **WHEN** an admin requests YAML export for one namespace
- **THEN** the UI retrieves YAML containing only that namespace

## MODIFIED Requirements

### Requirement: Initial E2E workflows
The project SHALL include Playwright workflows for namespace CRUD, entry CRUD, YAML import, and YAML export.

#### Scenario: Namespace CRUD workflow is exercised
- **WHEN** the Playwright suite runs against the local app
- **THEN** it creates, lists, updates, and deletes a namespace through the browser UI

#### Scenario: Entry CRUD workflow is exercised
- **WHEN** the Playwright suite runs against the local app
- **THEN** it creates, reads, updates, and deletes an entry within a namespace through the browser UI

#### Scenario: YAML import workflow is exercised
- **WHEN** the Playwright suite runs against the local app
- **THEN** it imports namespaces and entries through the browser YAML import UI

#### Scenario: YAML export workflow is exercised
- **WHEN** the Playwright suite runs against the local app
- **THEN** it exports all namespaces and a selected namespace through the browser YAML export UI

## REMOVED Requirements

### Requirement: Admin markdown import UI
**Reason**: The admin bulk import UI is being replaced by YAML terminology and the YAML API contract.
**Migration**: Admin users MUST paste or upload YAML and submit it through the YAML import UI.

The React admin frontend SHALL allow admin users to paste or upload markdown content and import namespaces and entries through the OKVNS API.

#### Scenario: Admin imports markdown
- **WHEN** an admin submits valid OKVNS markdown containing multiple namespaces
- **THEN** the UI calls the import API and shows the resulting imported namespaces

#### Scenario: Admin sees import validation error
- **WHEN** an admin submits invalid markdown
- **THEN** the UI displays the API validation error and keeps the submitted content available for correction

### Requirement: Admin markdown export UI
**Reason**: The admin bulk export UI is being replaced by YAML terminology and raw YAML output.
**Migration**: Admin users MUST use the YAML export UI, which copies/downloads raw YAML as `.yaml`.

The React admin frontend SHALL allow admin users to export all namespaces or a selected namespace as markdown.

#### Scenario: Admin exports all namespaces
- **WHEN** an admin requests a full export
- **THEN** the UI retrieves markdown from the API and presents it for copy or download

#### Scenario: Admin exports selected namespace
- **WHEN** an admin requests export for one namespace
- **THEN** the UI retrieves markdown containing only that namespace
