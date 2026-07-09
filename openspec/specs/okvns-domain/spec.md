## Purpose

Domain entities, value objects, invariants, and business errors for the OKVNS platform. Framework-independent core that enforces naming rules, entry uniqueness, and explicit error types.

## Requirements

### Requirement: Namespace identity and validation
The domain SHALL represent a namespace with a required unique name and a collection of entries. Namespace names MUST be trimmed, non-empty UTF-8 strings and MUST match an allowlisted resource-name format before they are accepted.

#### Scenario: Valid namespace name is accepted
- **WHEN** a namespace is created with a valid name
- **THEN** the domain returns a namespace with the normalized name

#### Scenario: Invalid namespace name is rejected
- **WHEN** a namespace is created with an empty or disallowed name
- **THEN** the domain returns a validation error without creating the namespace

### Requirement: Entry identity and validation
The domain SHALL represent an entry with a required unique name within its namespace and a UTF-8 string value. Entry names MUST be trimmed, non-empty UTF-8 strings and MUST match an allowlisted resource-name format before they are accepted.

#### Scenario: Valid entry is accepted
- **WHEN** an entry is created with a valid name and UTF-8 value
- **THEN** the domain returns an entry with the normalized name and supplied value

#### Scenario: Invalid entry name is rejected
- **WHEN** an entry is created with an empty or disallowed name
- **THEN** the domain returns a validation error without creating the entry

### Requirement: Namespace entry uniqueness
The domain SHALL prevent duplicate entry names within the same namespace and SHALL allow the same entry name in different namespaces.

#### Scenario: Duplicate entry in same namespace is rejected
- **WHEN** an entry is added to a namespace that already contains an entry with the same normalized name
- **THEN** the domain returns a duplicate-entry error

#### Scenario: Same entry name in different namespaces is accepted
- **WHEN** two different namespaces each contain an entry with the same normalized name
- **THEN** both namespaces remain valid

### Requirement: Domain errors are explicit
The domain SHALL expose explicit business errors for invalid names, duplicate namespaces, duplicate entries, missing namespaces, missing entries, and invalid YAML shapes.

#### Scenario: Business rule fails
- **WHEN** a domain invariant is violated
- **THEN** the domain returns or throws a typed business error that can be mapped by presentation layers

#### Scenario: YAML shape is invalid
- **WHEN** imported YAML violates the OKVNS YAML shape
- **THEN** the system returns or throws a typed invalid YAML error that can be safely mapped by presentation layers

### Requirement: Domain remains framework independent
The domain package MUST NOT import NestJS, React, browser APIs, persistence clients, HTTP adapters, or framework-specific decorators.

#### Scenario: Domain package is tested
- **WHEN** domain tests run in isolation
- **THEN** they execute without bootstrapping NestJS, React, HTTP servers, or infrastructure adapters
