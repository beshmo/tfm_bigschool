## Why

OKVNS currently stores namespaces and entries only in the API process, so all data is lost whenever the API restarts or a pod is replaced. The next product step is to make storage durable while preserving the existing clean-architecture boundaries, REST behavior, YAML import/export semantics, and safe error contract.

## What Changes

- Add MySQL as the primary persistent storage backend for namespaces and entries.
- Replace the API's default in-memory repository wiring with a MySQL-backed repository adapter.
- Add schema migration/setup support for namespace and entry tables, unique constraints, and cascading deletion.
- Preserve existing REST endpoints and response shapes while making namespace and entry data survive API restarts.
- Preserve YAML import validation semantics and apply valid multi-namespace imports inside a single storage transaction.
- Update local Docker Compose and Kubernetes deployment assets to configure MySQL connectivity and persistent storage.
- Update documentation and ADRs so OKVNS no longer claims storage is in-memory only.
- **BREAKING**: The default runtime deployment now requires a reachable MySQL database and database configuration.

## Capabilities

### New Capabilities

- `persistent-storage`: MySQL-backed durable storage, schema lifecycle, transaction behavior, and restart persistence requirements.

### Modified Capabilities

- `namespace-management`: Namespace listing, retrieval, rename, and deletion operate against durable storage instead of process memory.
- `entry-management`: Entry CRUD operations operate against durable storage while preserving namespace-scoped uniqueness.
- `markdown-bulk-operations`: YAML import/export operate against durable storage and valid imports are applied atomically in a database transaction.
- `deployment-foundation`: Local and Kubernetes deployments provision/configure MySQL and persistent storage instead of running with no backing service.

## Impact

- `apps/api`: Adds MySQL infrastructure adapter, database configuration, connection lifecycle, readiness checks, migration/bootstrap integration, and provider wiring.
- `packages/application`: May need repository-port changes or transaction-oriented methods for atomic rename and YAML import operations.
- `packages/domain` and `packages/yaml`: No persistence-client dependencies; existing validation and serialization behavior should remain framework-independent.
- `docker-compose.yml` and `deploy/k8s/**`: Add MySQL service/configuration, persistent volume claims or documented external database configuration, and API environment variables.
- `docs/**`, `README.md`, `AGENTS.md`, and ADRs: Replace MVP in-memory-only guidance with MySQL persistence guidance and operational notes.
- Dependencies: Add a MySQL client and any migration/query tooling selected in design.
