## Purpose

Local and Kubernetes deployment foundation for the OKVNS platform. Provides Docker Compose for local development, Kubernetes manifests for reference deployment, and runtime configuration through environment variables with health/readiness probes.

## Requirements

### Requirement: Local Docker Compose deployment
The project SHALL provide Docker Compose configuration for local development with one container for the API, one container for the admin frontend, and one MySQL backing service with persistent local data.

#### Scenario: Local platform starts with one command
- **WHEN** a developer runs the documented Docker Compose command
- **THEN** MySQL, the API, and the admin frontend start with local environment configuration

#### Scenario: Local data survives API restart
- **WHEN** a developer stores data through the local Docker Compose deployment and restarts only the API container
- **THEN** the stored data remains available after the API reconnects to MySQL

### Requirement: Kubernetes namespace and workloads
The project SHALL provide baseline Kubernetes manifests that deploy OKVNS resources into a single `okvns` namespace and configure the API to use MySQL-backed persistent storage.

#### Scenario: Kubernetes namespace is applied
- **WHEN** the Kubernetes manifests are applied
- **THEN** the `okvns` namespace, API workload, admin frontend workload, services, and required MySQL storage configuration are created

### Requirement: Runtime configuration through environment variables
The API and admin frontend SHALL receive runtime configuration through environment variables backed by local configuration, Kubernetes ConfigMaps, and Kubernetes Secrets where sensitive MySQL credentials are required.

#### Scenario: API port is configured externally
- **WHEN** the API starts in local or Kubernetes deployment
- **THEN** it reads its configured port from the environment with a documented default

#### Scenario: MySQL connection is configured externally
- **WHEN** the API starts in local or Kubernetes deployment
- **THEN** it reads MySQL host, port, database, user, and password configuration from the runtime environment

### Requirement: Health and readiness probes
The API SHALL expose health and readiness endpoints suitable for Docker and Kubernetes probes, and readiness SHALL depend on application startup, MySQL connectivity, and required schema availability.

#### Scenario: Health endpoint is available
- **WHEN** a probe requests the health endpoint
- **THEN** the API returns a successful health response while the process is running

#### Scenario: Readiness endpoint is available
- **WHEN** a probe requests the readiness endpoint after the application is ready and MySQL is reachable with the required schema
- **THEN** the API returns a successful readiness response

#### Scenario: Readiness fails when MySQL is unavailable
- **WHEN** a probe requests the readiness endpoint while MySQL is unavailable
- **THEN** the API returns a not-ready response

### Requirement: Persistent deployment
The deployment SHALL use MySQL-backed durable runtime state and SHALL NOT rely on API process memory for namespace or entry persistence.

#### Scenario: Deployment requires MySQL backing service
- **WHEN** OKVNS deployment is started
- **THEN** it runs with MySQL configuration and durable namespace and entry storage

#### Scenario: API restart does not clear stored data
- **WHEN** the API pod or process restarts after namespaces and entries have been stored
- **THEN** the stored namespaces and entries remain available after the API reconnects to MySQL

### Requirement: Logs are written to standard streams
Services SHALL write runtime logs to stdout and stderr rather than local log files.

#### Scenario: Service emits logs to container output
- **WHEN** the API or admin frontend container starts
- **THEN** operational logs are visible through container logs
