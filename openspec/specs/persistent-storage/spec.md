## Purpose

MySQL-backed durable storage for OKVNS namespaces and entries. Covers storage durability, relational constraints, transaction behavior, and schema lifecycle.

## Requirements

### Requirement: MySQL durable storage
The system SHALL use MySQL as the default durable source of truth for namespaces and entries.

#### Scenario: Data survives API restart
- **WHEN** a namespace with entries has been stored and the API process restarts
- **THEN** the namespace and entries remain available after the API reconnects to MySQL

#### Scenario: MySQL is required for default runtime
- **WHEN** the API starts in the default runtime profile without a reachable MySQL database
- **THEN** the API readiness check does not report ready

### Requirement: Relational storage constraints
The MySQL schema MUST enforce unique namespace names and unique entry names within each namespace.

#### Scenario: Duplicate namespace is rejected by storage
- **WHEN** concurrent requests attempt to create the same namespace name
- **THEN** only one namespace is stored
- **AND** the duplicate request receives a safe duplicate namespace error

#### Scenario: Duplicate entry is rejected by storage
- **WHEN** concurrent requests attempt to create the same entry name in the same namespace
- **THEN** only one entry is stored
- **AND** the duplicate request receives a safe duplicate entry error

### Requirement: Transactional persistence operations
The system SHALL apply multi-step storage mutations inside MySQL transactions.

#### Scenario: Namespace rename is atomic
- **WHEN** a namespace rename fails after storage mutation begins
- **THEN** the original namespace remains available with its entries
- **AND** the target namespace name is not partially stored

#### Scenario: YAML import transaction rolls back on failure
- **WHEN** a valid YAML import begins applying multiple namespaces and a storage error occurs before completion
- **THEN** none of the imported namespace changes are committed

### Requirement: Schema lifecycle
The project SHALL provide repeatable MySQL schema setup for local development, test, and deployment environments.

#### Scenario: Migrations create required tables
- **WHEN** the documented migration command is run against an empty MySQL database
- **THEN** the namespace and entry tables, indexes, and constraints required by OKVNS are created

#### Scenario: Readiness requires schema availability
- **WHEN** the API can connect to MySQL but the required schema is unavailable
- **THEN** the readiness endpoint reports that the API is not ready to serve traffic

