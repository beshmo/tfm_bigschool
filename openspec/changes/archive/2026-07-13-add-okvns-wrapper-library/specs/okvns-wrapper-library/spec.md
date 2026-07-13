## ADDED Requirements

### Requirement: Wrapper package for external entry reads
The system SHALL provide a framework-independent TypeScript wrapper package that external applications can use to read entry values from an already-running OKVNS API.

#### Scenario: Wrapper package exposes read API
- **WHEN** an external TypeScript application imports the wrapper package
- **THEN** it can construct an `OkvnsWrapper` with an API base URL and call `read(namespace, entry, defaultValue)` to read a value

#### Scenario: Wrapper stays framework independent
- **WHEN** the wrapper package is built
- **THEN** it does not depend on NestJS, React, MySQL, persistence adapters, application use cases, or browser-only APIs beyond the configurable fetch contract

### Requirement: Successful entry read returns value
The wrapper SHALL call `GET /namespaces/:namespace/entries/:entry` on the configured OKVNS API and return the retrieved entry value.

#### Scenario: Existing entry value is returned
- **WHEN** the configured OKVNS API returns a successful entry response for the requested namespace and entry
- **THEN** `read` resolves to the response entry value

#### Scenario: Path segments are encoded
- **WHEN** `read` is called with namespace and entry names that require URL encoding
- **THEN** the wrapper encodes each path segment before making the HTTP request

### Requirement: Missing entry reads return caller default
The wrapper SHALL return the caller-provided default value when the OKVNS API reports that the requested namespace or entry does not exist.

#### Scenario: Missing namespace returns default value
- **WHEN** the configured OKVNS API returns a namespace not-found response for a read request
- **THEN** `read` resolves to the caller-provided default value

#### Scenario: Missing entry returns default value
- **WHEN** the configured OKVNS API returns an entry not-found response for a read request
- **THEN** `read` resolves to the caller-provided default value

### Requirement: Unexpected read failures are surfaced
The wrapper SHALL surface network failures, validation failures, server failures, malformed successful responses, and other unexpected responses as typed wrapper errors instead of returning the default value.

#### Scenario: Network failure throws wrapper error
- **WHEN** the fetch operation fails before an API response is received
- **THEN** `read` rejects with a typed wrapper error that identifies a network failure

#### Scenario: Validation failure throws wrapper error
- **WHEN** the configured OKVNS API rejects the request with a validation error
- **THEN** `read` rejects with a typed wrapper error and does not return the default value

#### Scenario: Malformed success response throws wrapper error
- **WHEN** the configured OKVNS API returns a successful response that does not contain a string entry value
- **THEN** `read` rejects with a typed wrapper error that identifies an invalid response

### Requirement: Wrapper supports configurable fetch
The wrapper SHALL support an injected fetch-compatible implementation while defaulting to the runtime global fetch when no implementation is provided.

#### Scenario: Injected fetch is used
- **WHEN** an `OkvnsWrapper` is constructed with a custom fetch implementation
- **THEN** read requests use that implementation

#### Scenario: Missing fetch throws configuration error
- **WHEN** an `OkvnsWrapper` is constructed without an injected fetch in a runtime that has no global fetch
- **THEN** wrapper usage fails with a typed configuration error
