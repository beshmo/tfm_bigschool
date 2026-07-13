# ADR-0008: Use MySQL for Durable Storage

## Status

Accepted (supersedes [ADR-0003](0003-use-in-memory-storage-for-mvp.md))

## Context

OKVNS has moved past the MVP milestone recorded in ADR-0003, where namespace and entry data lived only in the API process and was lost on every restart or pod replacement. The next product step is durable storage that survives restarts while preserving the existing clean-architecture boundaries, REST contract, YAML import/export semantics, deterministic ordering, and safe error shapes.

The domain has strong uniqueness (namespace names, entry names within a namespace) and atomicity requirements (namespace rename, multi-namespace YAML import), which map cleanly onto relational constraints and transactions.

## Decision

Use **MySQL** as the default durable source of truth for namespaces and entries.

- Access MySQL through the **`mysql2`** promise client with a shared connection pool. No ORM is introduced, keeping persistence types (`mysql2` rows, pools, connections) confined to the `apps/api` infrastructure layer.
- Manage schema with **plain SQL migration files** applied by a small in-repo runner (`apps/api/scripts/migrate.mjs`), tracked in a `schema_migrations` table so runs are idempotent.
- Model data relationally: a `namespaces` table (stable id, unique name, timestamps) and an `entries` table (stable id, `namespace_id` foreign key, entry name, value, timestamps) with a unique `(namespace_id, entry_name)` and `ON DELETE CASCADE`.
- Extend the application `NamespaceRepository` port with insert-based `create`, atomic `rename`, and atomic `importNamespaces` so multi-step mutations run inside a single MySQL transaction.
- Keep an in-memory adapter (`OKVNS_STORAGE_DRIVER=memory`) as a non-durable profile for fast local demos and tests; MySQL is the documented default runtime.
- Make readiness depend on MySQL connectivity and required schema availability.

Alternatives considered: Redis (weaker as a source of truth for constraint enforcement), MongoDB (relational uniqueness/cascade/transactions are clearer in MySQL), a single JSON document per namespace (entry-level uniqueness and querying are clearer with rows), and heavier ORMs/query builders (Prisma, Drizzle, Kysely, TypeORM — rejected to keep infrastructure thin and avoid leaking entities/decorators across layers).

## Consequences

- Namespace and entry data survives API restarts and pod replacement.
- MySQL availability becomes part of API availability: readiness fails when the database is unreachable or unmigrated, and deployments must provision MySQL and run migrations.
- The default runtime now **requires** a reachable MySQL database and connection configuration (breaking change relative to the MVP).
- Domain and YAML packages remain free of persistence dependencies; only `apps/api` and the application repository port changed.
- Duplicate prevention is enforced by storage-level unique constraints in addition to the domain model, so concurrent writers cannot both win.
- Rollback to in-memory code loses access to durable data; database volumes/backups must be preserved for forward recovery.
