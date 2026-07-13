## 1. Storage Stack and Configuration

- [x] 1.1 Select the MySQL access and migration stack, documenting the choice in the implementation notes or ADR update.
- [x] 1.2 Add MySQL client, migration, and test-support dependencies to the relevant workspace manifests.
- [x] 1.3 Add API environment configuration for MySQL host, port, database, user, password, and connection behavior.
- [x] 1.4 Add safe configuration validation so missing or invalid MySQL settings fail startup or readiness clearly.

## 2. Schema and Migrations

- [x] 2.1 Create repeatable migrations for `namespaces` and `entries` tables with timestamps and stable identifiers.
- [x] 2.2 Add unique constraints for namespace names and `(namespace_id, entry_name)`.
- [x] 2.3 Add foreign key cascade behavior so deleting a namespace deletes its entries.
- [x] 2.4 Add documented migration commands for local development, test, and deployment setup.

## 3. Application Ports and Transactions

- [x] 3.1 Update application repository ports to support atomic namespace rename and multi-namespace YAML import operations.
- [x] 3.2 Update namespace use cases to use transaction-capable repository methods for rename and duplicate handling.
- [x] 3.3 Update entry use cases to preserve existing behavior while relying on durable storage duplicate protection.
- [x] 3.4 Update YAML import use case to validate the full document first and then apply all imported namespaces in one transaction.
- [x] 3.5 Keep fake/in-memory repository test doubles aligned with the updated application port contract.

## 4. MySQL Repository Adapter

- [x] 4.1 Implement row-to-domain and domain-to-row mapping for namespaces and entries without leaking persistence types outside infrastructure.
- [x] 4.2 Implement list, lookup, create/update, rename, delete, and namespace-entry replacement operations against MySQL.
- [x] 4.3 Map MySQL duplicate-key and missing-row cases to existing domain/application errors and safe API responses.
- [x] 4.4 Ensure deterministic ordering for namespace and entry reads.
- [x] 4.5 Wire the NestJS API to use the MySQL repository adapter by default.

## 5. Readiness and Deployment

- [x] 5.1 Update health/readiness behavior so readiness verifies MySQL connectivity and required schema availability.
- [x] 5.2 Update Docker Compose with a MySQL service, persistent local volume, API dependency configuration, and documented startup.
- [x] 5.3 Update Kubernetes manifests for MySQL-backed configuration, including ConfigMaps and Secrets for sensitive database values.
- [x] 5.4 Document the local and Kubernetes persistence model, restart behavior, and operational assumptions.

## 6. Tests

- [x] 6.1 Add MySQL adapter integration tests for create, list, retrieve, rename, delete, duplicate namespace, and duplicate entry behavior.
- [x] 6.2 Add transaction tests proving failed rename and failed YAML import leave existing storage unchanged.
- [x] 6.3 Add restart-persistence coverage showing stored namespaces and entries remain after API/repository recreation.
- [x] 6.4 Update API contract tests to run against the MySQL-backed repository where persistence behavior matters.
- [x] 6.5 Keep fast domain/application tests independent from MySQL by using fake repositories.

## 7. Documentation and Verification

- [x] 7.1 Supersede the in-memory MVP ADR with a MySQL persistence ADR.
- [x] 7.2 Update README, architecture, deployment, engineering-practices, AGENTS, and CLAUDE guidance that still says storage is in-memory only.
- [x] 7.3 Run lint, typecheck, unit tests, integration tests, build, and OpenSpec validation.
- [x] 7.4 Verify Docker Compose startup, API readiness, data creation, API restart, and data survival locally.
