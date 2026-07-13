## Context

OKVNS currently uses an in-memory `NamespaceRepository` adapter wired directly in the NestJS API module. The domain and application packages already isolate business rules and use cases behind a repository port, so persistence can be replaced without importing database clients into domain code.

The current behavior is simple but intentionally non-durable: namespace and entry data disappears when the API process restarts. This change makes MySQL the default source of truth while preserving the existing API contract, YAML validation rules, deterministic ordering, and safe error responses.

## Goals / Non-Goals

**Goals:**

- Store namespaces and entries durably in MySQL.
- Preserve existing REST endpoint paths, request DTOs, response DTOs, validation behavior, and safe error shapes.
- Keep domain and YAML packages free of MySQL, ORM, NestJS, and infrastructure dependencies.
- Enforce namespace-name uniqueness and entry-name uniqueness in storage as well as in the domain model.
- Apply namespace rename and YAML multi-namespace import as atomic database operations.
- Add local Docker Compose and Kubernetes configuration for MySQL-backed runtime.
- Make readiness depend on successful MySQL connectivity.

**Non-Goals:**

- No authentication, authorization, auditing, multi-tenant isolation, or row-level access control.
- No Redis, MongoDB, filesystem-backed persistence, queues, workers, or event sourcing.
- No public API shape changes unless required for safe error reporting.
- No data migration from previous in-memory deployments, because no durable source exists to migrate.
- No horizontal write-scaling design beyond a single shared MySQL database.

## Decisions

### Use MySQL as the primary backing service

MySQL becomes the default durable source of truth for OKVNS namespaces and entries.

Rationale: OKVNS has strong uniqueness and atomicity requirements that map cleanly to relational constraints and transactions. MySQL is also straightforward to run in Docker Compose and common to operate as a Kubernetes backing service.

Alternatives considered:

- Redis: rejected as the primary store because persistence configuration, eviction behavior, and constraint enforcement make it a weaker source of truth.
- MongoDB: viable for namespace documents with embedded entries, but relational uniqueness, cascade behavior, and transaction familiarity make MySQL a better first durable store for this project.
- Filesystem: rejected for production-shaped deployment because locking, corruption recovery, replica safety, and persistent volume concerns would dominate the implementation.

### Model namespaces and entries relationally

Use a normalized schema:

- `namespaces`: stable id, unique normalized name, timestamps.
- `entries`: stable id, namespace foreign key, entry name, string value, timestamps.
- Constraints:
  - unique namespace name.
  - unique `(namespace_id, entry_name)`.
  - entries cascade when a namespace is deleted.

Rationale: This schema directly represents the aggregate boundary while letting MySQL enforce duplicate prevention under concurrency.

Alternative considered: storing one JSON document per namespace in MySQL. Rejected because entry-level uniqueness, updates, and deterministic querying are clearer with relational rows.

### Add transaction-oriented persistence operations

The current repository port exposes primitive `save` and `delete` methods. Implementation should either extend the port or add use-case-specific repository methods so multi-step mutations happen in one database transaction:

- create namespace with duplicate handling.
- rename namespace atomically.
- replace all entries for a namespace during YAML import.
- apply all imported namespaces from one YAML request atomically.

Rationale: The current in-memory adapter can mutate a `Map` in-process, but durable storage must be correct under concurrent requests and partial failures.

Alternative considered: keep the existing port unchanged and put transactions only inside adapter methods. Rejected for rename and YAML import because the current use cases perform multiple repository calls that cannot be made atomic from inside a single adapter method.

### Keep domain reconstruction explicit

The MySQL adapter should map rows into `Namespace` and `Entry` aggregates before returning data to application use cases. Persistence-specific row shapes must not leak into domain or presentation layers.

Rationale: This preserves existing clean-architecture boundaries and keeps domain rules testable without MySQL.

### Use migrations for schema lifecycle

Introduce an explicit migration mechanism for creating and evolving MySQL tables. The API should fail readiness until required schema state is available.

Rationale: Durable storage needs repeatable setup for local development, CI, and deployment. Hidden boot-time table creation makes operational failure harder to reason about.

### Keep in-memory repositories for tests only

The in-memory repository may remain as a test double or explicit local-development fallback, but the documented default runtime should be MySQL-backed.

Rationale: Fast application tests still benefit from a fake repository, while deployment documentation should no longer imply durable behavior without MySQL.

## Risks / Trade-offs

- MySQL availability becomes part of API availability -> readiness checks must fail when the database is unreachable, and deployment docs must describe startup order and configuration.
- Transaction boundaries may require changing application ports -> keep changes narrow and use adapter integration tests to lock behavior down.
- Duplicate checks can race under concurrent requests -> rely on MySQL unique constraints and map duplicate-key errors to existing domain/application errors.
- YAML import can become expensive for large documents -> validate first, then perform one bounded transaction using bulk upserts/replacements where practical.
- Kubernetes persistence is environment-specific -> provide reference manifests and document when an external managed MySQL service is preferable to an in-cluster database.
- Rollback from MySQL-backed code to in-memory code loses access to durable data -> rollback should preserve database volumes/backups and only roll back application behavior if necessary.

## Migration Plan

1. Add MySQL dependency, configuration, migration tooling, and local test database setup.
2. Introduce schema migrations for `namespaces` and `entries`.
3. Add MySQL repository adapter and transaction-capable application port changes.
4. Switch API provider wiring to MySQL by default while keeping fake/in-memory adapters for tests.
5. Update readiness checks to verify database connectivity and schema availability.
6. Update Docker Compose with a MySQL service and persistent volume.
7. Update Kubernetes manifests and documentation with database configuration and persistent storage expectations.
8. Update ADRs and README to supersede in-memory-only guidance.

Rollback: stop the new API version, redeploy the previous in-memory API version if necessary, and preserve the MySQL data volume or external database for forward recovery. No automatic down-migration to in-memory state is supported.

## Open Questions

- Which migration/query stack should be used in implementation: Prisma, Drizzle, Kysely, TypeORM, or direct `mysql2` with SQL migrations?
- Should local development always require Docker MySQL, or should an explicitly named in-memory profile remain available for fast manual demos?
- Should Kubernetes reference manifests deploy MySQL in-cluster for local clusters, or document external managed MySQL as the production recommendation?
