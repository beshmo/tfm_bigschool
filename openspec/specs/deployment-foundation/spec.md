## Purpose

Local and Kubernetes deployment foundation for the OKVNS platform. Provides Docker Compose for local development, Kubernetes manifests for reference deployment, and runtime configuration through environment variables with health/readiness probes.

## Requirements

### Requirement: Local Docker Compose deployment
The project SHALL provide Docker Compose configuration for local development with one container for the API and one container for the admin frontend.

#### Scenario: Local platform starts with one command
- **WHEN** a developer runs the documented Docker Compose command
- **THEN** the API and admin frontend start with local environment configuration

### Requirement: Kubernetes namespace and workloads
The project SHALL provide baseline Kubernetes manifests that deploy OKVNS resources into a single `okvns` namespace.

#### Scenario: Kubernetes namespace is applied
- **WHEN** the Kubernetes manifests are applied
- **THEN** the `okvns` namespace, API workload, admin frontend workload, and services are created

### Requirement: Runtime configuration through environment variables
The API and admin frontend SHALL receive runtime configuration through environment variables backed by local configuration or Kubernetes ConfigMaps.

#### Scenario: API port is configured externally
- **WHEN** the API starts in local or Kubernetes deployment
- **THEN** it reads its configured port from the environment with a documented default

### Requirement: Health and readiness probes
The API SHALL expose health and readiness endpoints suitable for Docker and Kubernetes probes.

#### Scenario: Health endpoint is available
- **WHEN** a probe requests the health endpoint
- **THEN** the API returns a successful health response while the process is running

#### Scenario: Readiness endpoint is available
- **WHEN** a probe requests the readiness endpoint
- **THEN** the API returns a successful readiness response after the application is ready to serve traffic

### Requirement: Stateless first deployment
The first deployment SHALL use in-memory runtime state only and SHALL NOT require Redis, databases, message brokers, persistent volumes, or Kubernetes Secrets.

#### Scenario: Deployment has no external backing service requirement
- **WHEN** the first OKVNS deployment is started
- **THEN** it runs without provisioning Redis, a database, queues, or secrets

### Requirement: Logs are written to standard streams
Services SHALL write runtime logs to stdout and stderr rather than local log files.

#### Scenario: Service emits logs to container output
- **WHEN** the API or admin frontend container starts
- **THEN** operational logs are visible through container logs
