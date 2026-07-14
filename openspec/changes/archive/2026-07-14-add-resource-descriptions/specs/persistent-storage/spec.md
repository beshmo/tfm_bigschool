## MODIFIED Requirements

### Requirement: MySQL durable storage
The system SHALL use MySQL as the default durable source of truth for namespaces, entries, and their optional descriptions.

#### Scenario: Data survives API restart
- **WHEN** a namespace with a description and entries with descriptions has been stored and the API process restarts
- **THEN** the namespace, namespace description, entries, and entry descriptions remain available after the API reconnects to MySQL

#### Scenario: MySQL is required for default runtime
- **WHEN** the API starts in the default runtime profile without a reachable MySQL database
- **THEN** the API readiness check does not report ready

### Requirement: Schema lifecycle
The project SHALL provide repeatable MySQL schema setup and forward migrations for local development, test, and deployment environments.

#### Scenario: Migrations create required tables
- **WHEN** the documented migration command is run against an empty MySQL database
- **THEN** the namespace and entry tables, description columns, indexes, and constraints required by OKVNS are created

#### Scenario: Description migration upgrades existing schema
- **WHEN** the documented migration command is run against a database that already has the initial namespace and entry tables
- **THEN** nullable description columns are added for namespaces and entries without dropping existing data

#### Scenario: Readiness requires schema availability
- **WHEN** the API can connect to MySQL but the required schema is unavailable
- **THEN** the readiness endpoint reports that the API is not ready to serve traffic
