## Purpose

MySQL-backed durable storage for OKVNS namespaces and entries. Covers storage durability, relational constraints, transaction behavior, and schema lifecycle.

## Requirements

### Requirement: MySQL durable storage
The system SHALL use MySQL as the default durable source of truth for namespaces, entries, their optional descriptions, and entry `env_dependent` metadata.

#### Scenario: Data survives API restart
- **WHEN** a namespace with a description and entries with descriptions and `env_dependent` values has been stored and the API process restarts
- **THEN** the namespace, namespace description, entries, entry descriptions, and entry `env_dependent` values remain available after the API reconnects to MySQL

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
The project SHALL provide repeatable MySQL schema setup and forward migrations for local development, test, and deployment environments.

#### Scenario: Migrations create required tables
- **WHEN** the documented migration command is run against an empty MySQL database
- **THEN** the namespace and entry tables, description columns, entry `env_dependent` column, indexes, and constraints required by OKVNS are created

#### Scenario: Description migration upgrades existing schema
- **WHEN** the documented migration command is run against a database that already has the initial namespace and entry tables
- **THEN** nullable description columns are added for namespaces and entries without dropping existing data

#### Scenario: Entry env_dependent migration upgrades existing schema
- **WHEN** the documented migration command is run against a database that already has the initial namespace and entry tables
- **THEN** a non-null entry `env_dependent` column is added with a default of `false` without dropping existing data

#### Scenario: Readiness requires schema availability
- **WHEN** the API can connect to MySQL but the required schema is unavailable
- **THEN** the readiness endpoint reports that the API is not ready to serve traffic

### Requirement: Documented schema and migration contract
The MySQL schema and the migration runner behavior SHALL be documented in `docs/architecture.md` with column types, collation, constraints, and runner semantics.

#### Scenario: Schema details are documented
- **WHEN** a reader consults the storage documentation
- **THEN** it states the `utf8mb4_bin` collation, column names, types and lengths, the `updated_at` to `modified_at` mapping, the unique keys, the cascade rule, and the `schema_migrations` columns

#### Scenario: Runner semantics are documented
- **WHEN** a reader consults the migration runner documentation
- **THEN** it states filename ordering, skipping of recorded migrations, stop-on-failure with retry on the next run, idempotency expectations, and the absence of a concurrency lock

