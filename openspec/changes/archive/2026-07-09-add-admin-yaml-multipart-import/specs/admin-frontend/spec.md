## MODIFIED Requirements

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
- **THEN** it imports namespaces and entries through the browser pasted YAML import UI and uploaded YAML file import UI

#### Scenario: YAML export workflow is exercised
- **WHEN** the Playwright suite runs against the local app
- **THEN** it exports all namespaces and a selected namespace through the browser YAML export UI
