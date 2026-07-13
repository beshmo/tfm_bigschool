# Deployment

OKVNS supports local Docker Compose usage and reference Kubernetes manifests.

Namespace and entry state is durable in **MySQL**. It survives API restarts and
pod replacement; it is cleared only by removing the database volume. API
readiness depends on MySQL connectivity and the required schema, so probes hold
traffic until the database is reachable and migrated.

## Docker Compose

Run the local platform:

```bash
docker compose up --build
```

Services:

| Service   | URL / Port              |
| --------- | ----------------------- |
| API       | `http://localhost:3000` |
| Admin web | `http://localhost:8080` |
| MySQL     | `localhost:3306`        |

The Compose file starts a MySQL service, a one-shot `migrate` job that creates
or upgrades the schema, the API, and the admin frontend. The API waits for MySQL
to be healthy and for migrations to complete before it starts.

Data persistence and restart behavior:

- MySQL data lives in the named volume `okvns-mysql-data`.
- Restarting only the API keeps stored data: `docker compose restart api`.
- `docker compose down` keeps the volume; `docker compose down -v` deletes it and
  resets all stored namespaces and entries.

Logs go to stdout/stderr.

## Kubernetes

Manifests live in `deploy/k8s/` and deploy resources into the `okvns` namespace.

Build local images:

```bash
docker build -f apps/api/Dockerfile -t okvns/api:latest .
docker build -f apps/admin-web/Dockerfile -t okvns/admin-web:latest .
```

Load images into your cluster when required, for example with kind:

```bash
kind load docker-image okvns/api:latest
kind load docker-image okvns/admin-web:latest
```

Apply manifests:

```bash
kubectl apply -f deploy/k8s/
kubectl -n okvns get pods
```

The manifests create:

- Namespace `okvns`
- MySQL `Secret`, headless `Service`, and a `StatefulSet` with a `PersistentVolumeClaim` (`deploy/k8s/05-mysql.yaml`)
- API ConfigMap (including MySQL host/port/database) and Deployment with a
  `migrate` init container that applies the schema before the API starts
- Admin frontend ConfigMap, Deployment, and Service
- API health and readiness probes
- A placeholder Ingress in `deploy/k8s/50-ingress.yaml`

The MySQL `PersistentVolumeClaim` keeps namespace/entry data across API pod
restarts and rescheduling. Restarting or replacing the API pod does not clear
data; deleting the PVC does.

## Configuration

Non-sensitive runtime configuration (including MySQL host, port, and database
name) is supplied through environment variables and Kubernetes ConfigMaps.
Sensitive MySQL credentials (`OKVNS_MYSQL_USER`, `OKVNS_MYSQL_PASSWORD`, and the
MySQL root password) come from the `okvns-mysql-secret` Secret — replace the
placeholder values before deploying anywhere real.

For production, prefer a managed MySQL service and point `OKVNS_MYSQL_HOST` at it
instead of running the in-cluster `StatefulSet`.

## Migrations

Schema is managed with plain SQL files under `apps/api/migrations/`, applied by
`apps/api/scripts/migrate.mjs`:

- Local / test: `pnpm --filter @okvns/api run migrate` (with `OKVNS_MYSQL_*` set).
- Docker Compose: the `migrate` service runs automatically before the API.
- Kubernetes: the API Deployment's `migrate` init container runs on each pod start.

Migrations are idempotent and tracked in a `schema_migrations` table, so
re-running is safe.

## Deployment Constraints

- Preserve the MySQL volume/PVC (or managed database) to keep data across restarts.
- Do not introduce Redis, queues, or workers without a new design/spec change.
