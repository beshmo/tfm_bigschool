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

## Kubernetes Manifests

Manifests live in `deploy/k8s/` and deploy resources into the `okvns` namespace.

The manifests use the published Docker Hub images by default:

| Workload  | Image                                |
| --------- | ------------------------------------ |
| API       | `beshmo/okvns:okvns-api-1.0.2`       |
| Admin web | `beshmo/okvns:okvns-admin-web-1.0.2` |

Apply manifests:

```bash
kubectl apply -f deploy/k8s/
kubectl -n okvns get pods
```

To test local image builds instead, edit the image fields in `deploy/k8s/20-api.yaml`
and `deploy/k8s/40-web.yaml`, then load the images into your cluster when required,
for example with kind:

```bash
docker build -f apps/api/Dockerfile -t okvns/api:latest .
docker build -f apps/admin-web/Dockerfile -t okvns/admin-web:latest .
kind load docker-image okvns/api:latest
kind load docker-image okvns/admin-web:latest
```

Production images are published by CI to the public Docker Hub repository
`beshmo/okvns` for the API and admin frontend only:

| Asset     | Dockerfile                  | Example tags                                                                                                        |
| --------- | --------------------------- | ------------------------------------------------------------------------------------------------------------------- |
| API       | `apps/api/Dockerfile`       | `beshmo/okvns:okvns-api-main`, `beshmo/okvns:okvns-api-sha-<sha>`, `beshmo/okvns:okvns-api-1.2.3`                   |
| Admin web | `apps/admin-web/Dockerfile` | `beshmo/okvns:okvns-admin-web-main`, `beshmo/okvns:okvns-admin-web-sha-<sha>`, `beshmo/okvns:okvns-admin-web-1.2.3` |

Pull request CI builds these production images without pushing them. Pushes to
`main` publish branch and SHA tags, and Git tags like `v1.2.3` publish
versioned asset tags. The demo web image is not part of the production image
publishing flow.

Docker Hub publishing requires these GitHub repository secrets:

- `DOCKERHUB_USERNAME`: Docker Hub user name, for example `beshmo`.
- `DOCKERHUB_TOKEN`: Docker Hub access token. Use an access token rather than a
  Docker Hub account password so CI credentials can be revoked independently.

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
data; deleting the PVC does. The reference manifests set
`storageClassName: do-block-storage` for DigitalOcean Kubernetes block storage.

## Helm

The Helm chart lives in `deploy/helm/okvns/` and renders the same reference
deployment as the raw Kubernetes manifests. Default values use:

- API image: `beshmo/okvns:okvns-api-1.0.2`
- Admin web image: `beshmo/okvns:okvns-admin-web-1.0.2`
- Namespace: `okvns`

Render the chart locally:

```bash
helm template okvns deploy/helm/okvns
```

Install the chart:

```bash
helm install okvns deploy/helm/okvns
kubectl -n okvns get pods
```

The chart includes a Namespace template by default. To use a namespace that is
managed outside the chart, disable namespace creation and set the target
namespace explicitly:

```bash
helm install okvns deploy/helm/okvns \
  --set namespace.create=false \
  --set namespace.name=okvns
```

Override image tags or other runtime settings with `--set` or a custom values
file:

```bash
helm upgrade --install okvns deploy/helm/okvns \
  --set api.image.tag=okvns-api-1.0.2 \
  --set adminWeb.image.tag=okvns-admin-web-1.0.2
```

The chart defaults MySQL persistence to the DigitalOcean Kubernetes block
storage class, `do-block-storage`. Override `mysql.persistence.storageClassName`
when deploying to a cluster with a different storage class.

Before deploying outside a local/dev cluster, replace the placeholder MySQL
credentials in `deploy/helm/okvns/values.yaml` or provide overrides for
`mysql.credentials.rootPassword`, `mysql.credentials.user`, and
`mysql.credentials.password`.

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

## Container Images

Both Dockerfiles use the **repository root as build context**
(`docker build -f apps/<app>/Dockerfile .`), install with
`pnpm install --frozen-lockfile --ignore-scripts` (the lockfile is the source of
truth for dependency versions), and use two stages: `build` and `runtime`.
Corepack is installed explicitly (`corepack@0.35.0`) because Node 26 no longer
bundles it.

| Image       | Build stage                                                                                         | Runtime stage                                                                           | Port | User    |
| ----------- | --------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------- | ---- | ------- |
| `api`       | `node:26-alpine`; builds shared, domain, yaml, application, api in order; `pnpm deploy --prod /app` | `node:26-alpine`, `NODE_ENV=production`, `OKVNS_API_PORT=3000`, `CMD node dist/main.js` | 3000 | `node`  |
| `admin-web` | `node:26-alpine`; builds shared, admin-web                                                          | `nginx:1.31-alpine` serving `dist` on `/usr/share/nginx/html`                           | 8080 | `nginx` |
| `demo-web`  | same pattern as admin-web (adds the wrapper package)                                                | `nginx:1.31-alpine`                                                                     | 8080 | `nginx` |

Static assets are root-owned and read-only; only `env.js` is writable by the
`nginx` user.

### Runtime configuration of the web images

The SPA cannot read container environment variables directly, so:

1. `public/env.js` ships as a placeholder that sets
   `window.__OKVNS_API_BASE_URL__ = ''` (empty means "use the build-time URL").
2. The image copies `docker-entrypoint.sh` to
   `/docker-entrypoint.d/40-okvns-env.sh`; the stock nginx entrypoint runs it
   before starting nginx. It rewrites `env.js` with
   `window.__OKVNS_API_BASE_URL__ = "${OKVNS_API_BASE_URL}"`, defaulting to
   `http://localhost:3000` (also the image's `ENV` default).
3. `nginx.conf` listens on 8080, serves `env.js` with `Cache-Control: no-store`
   so a restart with a new value takes effect, and falls back to `index.html`
   for client-side routes (`try_files $uri /index.html`).

The demo stack (`docker-compose.demo.yml`) runs MySQL (3307), the API (3001),
admin-web (8082) and demo-web (8083); see `apps/demo-web/README.md`. Demo-web
images are not part of production publishing.

## Deployment Constraints

- Preserve the MySQL volume/PVC (or managed database) to keep data across restarts.
- Do not introduce Redis, queues, or workers without a new design/spec change.
