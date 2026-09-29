# OKVNS TFM Project

TFM project for "Master en desarrollo con IA" by BigSchool.

OKVNS (Organized Key-Value NamespaceS) is a runtime configuration platform that lets services and applications read centrally managed UTF-8 key-value settings from named namespaces, so operators can change behavior without redeploying the consuming apps.

## For Contributors

This repository is a TypeScript pnpm monorepo with a NestJS API, React/Vite admin frontend, and shared packages organized by clean-architecture boundaries.

Start here when contributing code:

- Read the architecture boundaries before changing package dependencies.
- Use the API and YAML reference when changing contracts.
- Follow testing and implementation expectations.
- Use deployment docs for Docker Compose and Kubernetes.

## Documentation Index

| Document                                                                                                                   | Purpose                                                                                              |
| -------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------- |
| [`docs/api-and-yaml.md`](docs/api-and-yaml.md)                                                                             | REST endpoint reference, name rules, error shape, and YAML import/export contract.                   |
| [`docs/architecture.md`](docs/architecture.md)                                                                             | Workspace layout, clean-architecture boundaries, runtime configuration, and cloud-native principles. |
| [`docs/deployment.md`](docs/deployment.md)                                                                                 | Docker Compose and Kubernetes deployment instructions and constraints.                               |
| [`docs/engineering-practices.md`](docs/engineering-practices.md)                                                           | Implementation, testing, BDD naming, coverage, and security expectations.                            |
| [`docs/adr/README.md`](docs/adr/README.md)                                                                                 | Architecture Decision Record index.                                                                  |
| [`docs/adr/0001-use-pnpm-typescript-monorepo.md`](docs/adr/0001-use-pnpm-typescript-monorepo.md)                           | Decision to use a pnpm TypeScript monorepo.                                                          |
| [`docs/adr/0002-use-clean-architecture-boundaries.md`](docs/adr/0002-use-clean-architecture-boundaries.md)                 | Decision to enforce clean architecture dependency boundaries.                                        |
| [`docs/adr/0003-use-in-memory-storage-for-mvp.md`](docs/adr/0003-use-in-memory-storage-for-mvp.md)                         | Decision to keep MVP storage in memory only (superseded by ADR-0008).                                |
| [`docs/adr/0004-use-strict-okvns-yaml-contract.md`](docs/adr/0004-use-strict-okvns-yaml-contract.md)                       | Decision to use strict OKVNS YAML import/export validation.                                          |
| [`docs/adr/0005-use-nestjs-api-and-react-vite-admin.md`](docs/adr/0005-use-nestjs-api-and-react-vite-admin.md)             | Decision to use NestJS for the API and React/Vite for the admin frontend.                            |
| [`docs/adr/0006-use-containerized-stateless-deployment.md`](docs/adr/0006-use-containerized-stateless-deployment.md)       | Decision to package and deploy stateless containers.                                                 |
| [`docs/adr/0007-use-layered-test-strategy-and-safe-errors.md`](docs/adr/0007-use-layered-test-strategy-and-safe-errors.md) | Decision to use layered verification and safe API error responses.                                   |
| [`docs/adr/0008-use-mysql-for-durable-storage.md`](docs/adr/0008-use-mysql-for-durable-storage.md)                         | Decision to use MySQL for durable storage.                                                           |

## Current Constraints

- Storage is durable in **MySQL**: namespaces and entries survive API restarts. The default runtime requires a reachable MySQL database (see Runtime Configuration). A non-durable `OKVNS_STORAGE_DRIVER=memory` profile remains for fast local demos and tests.
- There is no authentication or authorization in the first implementation.
- Beyond MySQL there is no Redis, queue, or filesystem-backed persistence.
- YAML import accepts canonical `namespaces: [...]` and legacy single `namespace: ...`; export always uses `namespaces: [...]`.

## Workspace Layout

| Path                     | Role                                                       |
| ------------------------ | ---------------------------------------------------------- |
| `packages/shared`        | Framework-independent types, constants, and helpers.       |
| `packages/domain`        | Entities, value objects, invariants, and business errors.  |
| `packages/application`   | Use cases and repository ports.                            |
| `packages/yaml`          | Strict OKVNS YAML parser and serializer.                   |
| `packages/okvns-wrapper` | External TypeScript client for reading entry values.       |
| `apps/api`               | NestJS REST API, MySQL repository adapter, and migrations. |
| `apps/admin-web`         | React + Vite admin frontend.                               |
| `deploy/k8s`             | Kubernetes reference manifests.                            |
| `e2e`                    | Playwright browser workflows.                              |

## Prerequisites

Tools required to build, test, and run this stack locally:

- **Node.js >= 22.22.1** — pinned in `engines.node` (`package.json`).
- **pnpm 11** — pinned to `11.9.0` via `packageManager` (`package.json`) and used by CI; enable through Corepack.
- **Docker and Docker Compose v2** — runs the durable MySQL backend locally, the full stack (`docker compose up`), and the API/admin container images. Not needed only if you exclusively use the non-durable `OKVNS_STORAGE_DRIVER=memory` profile and never build images.
- **Git** — required for cloning and for the Husky pre-commit hook that `pnpm install` sets up automatically (`prepare` script, runs `lint-staged`).
- **OpenSpec CLI** — only needed if you add or change capabilities (see [OpenSpec Workflow](#openspec-workflow)). Not required to build, test, or run the stack.

Enable Corepack and pin the exact pnpm version:

```bash
corepack enable
corepack prepare pnpm@11.9.0 --activate
```

Playwright E2E tests additionally need browser binaries (see [Common Commands](#common-commands)):

```bash
pnpm test:e2e:install            # installs the Chromium browser
pnpm test:e2e:install --with-deps  # on Linux, also installs OS-level browser deps (matches CI)
```

### Installing the prerequisites on Ubuntu (including WSL2)

The steps below target Ubuntu running under WSL2 on Windows. They also apply to native Ubuntu, except for the Docker section (see the note there).

#### 1. Git and basic tools

```bash
sudo apt update && sudo apt install -y git curl ca-certificates
```

#### 2. Node.js 22 (via nvm)

```bash
curl -o- https://raw.githubusercontent.com/nvm-sh/nvm/master/install.sh | bash
# restart the terminal (or `source ~/.bashrc`), then:
nvm install 22
nvm use 22
node --version   # must be >= 22.22.1
```

#### 3. pnpm (via Corepack)

Corepack ships with Node. Use the commands from [Prerequisites](#prerequisites):

```bash
corepack enable
corepack prepare pnpm@11.9.0 --activate
pnpm --version   # 11.9.0
```

#### 4. Docker with WSL integration (WSL2)

On WSL2 the recommended setup is **Docker Desktop for Windows** with WSL integration. Docker Desktop runs on the Windows side, so most of these steps happen in Windows rather than in the Ubuntu shell.

1. **Check that WSL2 is your backend.** In PowerShell:

   ```powershell
   wsl -l -v
   ```

   Your Ubuntu distro must show `VERSION 2`. If it shows `1`, run `wsl --set-version <DistroName> 2`.

2. **Install Docker Desktop for Windows** from <https://www.docker.com/products/docker-desktop/>. Keep **Use WSL 2 instead of Hyper-V** checked in the installer and restart if prompted.

3. **Enable WSL integration.** Open Docker Desktop, then go to **Settings**:
   - **General**: confirm **Use the WSL 2 based engine** is ticked.
   - **Resources → WSL Integration**: turn on **Enable integration with my default WSL distro** and toggle on your Ubuntu distro.
   - Click **Apply & Restart**.

4. **Verify from a new Ubuntu terminal** (existing terminals may not pick up the change):

   ```bash
   docker --version
   docker compose version   # must be Compose v2
   docker run --rm hello-world
   ```

Troubleshooting:

- **`docker: command not found` in Ubuntu**: Docker Desktop must be running and the integration toggle for your distro must be on. Try `wsl --shutdown` from PowerShell and reopen Ubuntu.
- **Permission denied on `/var/run/docker.sock`**: run `sudo usermod -aG docker $USER` and reopen the terminal.
- **Two Docker daemons**: do not run a Docker Engine installed inside Ubuntu alongside Docker Desktop. Use one or the other.
- **Slow installs and builds**: keep the repository inside the Linux filesystem (for example `~/tfm_bigschool`), not under `/mnt/c/...`.

> **Native Ubuntu (no WSL):** skip Docker Desktop and install Docker Engine plus the Compose v2 plugin (`docker-ce`, `docker-compose-plugin`) following <https://docs.docker.com/engine/install/ubuntu/>.

Once `docker compose version` works, `docker compose up -d mysql` from the repository root starts the local database (see [Local Development](#local-development)).

#### 5. Playwright browser dependencies (E2E only)

```bash
pnpm install
pnpm test:e2e:install --with-deps   # uses sudo/apt to install the OS libraries Chromium needs
```

#### 6. OpenSpec CLI (only for spec-driven changes)

The repository is already initialized for OpenSpec (`openspec/` and the `/opsx:*` commands under `.claude/`), so you only need the CLI itself. Install it globally with npm (available once Node is installed):

```bash
npm install -g @fission-ai/openspec@latest
openspec --version
```

You do **not** need to run `openspec init` again. See [OpenSpec Workflow](#openspec-workflow) for how it is used.

## Local Development

Install dependencies:

```bash
pnpm install
```

The API defaults to the durable MySQL backend. For local development you can
either run MySQL yourself and apply migrations, or use the non-durable in-memory
profile for a quick demo.

With MySQL (durable) — start a database, then apply the schema:

```bash
# Example local MySQL via Docker:
docker run --name okvns-mysql -e MYSQL_ROOT_PASSWORD=root -e MYSQL_DATABASE=okvns \
  -e MYSQL_USER=okvns -e MYSQL_PASSWORD=okvns -p 3306:3306 -d mysql:26.7

export OKVNS_MYSQL_HOST=127.0.0.1 OKVNS_MYSQL_DATABASE=okvns \
  OKVNS_MYSQL_USER=okvns OKVNS_MYSQL_PASSWORD=okvns
pnpm --filter @okvns/api run migrate   # create/upgrade tables
```

Without MySQL (non-durable, fast demos): set `OKVNS_STORAGE_DRIVER=memory`.

Run the API and admin frontend in separate terminals:

```bash
pnpm --filter @okvns/api run start:dev
pnpm --filter @okvns/admin-web run dev
```

Local URLs:

| Service       | URL                               |
| ------------- | --------------------------------- |
| API           | `http://localhost:3000`           |
| API docs (UI) | `http://localhost:3000/docs`      |
| OpenAPI JSON  | `http://localhost:3000/docs-json` |
| Admin web     | `http://localhost:5173`           |

## Common Commands

```bash
pnpm lint
pnpm typecheck
pnpm test
pnpm test:coverage
pnpm build
```

Playwright E2E:

```bash
pnpm test:e2e:install
docker compose up -d mysql
pnpm test:e2e
```

`pnpm test:e2e` runs API migrations before starting the API web server. The
Compose `mysql` service exposes `127.0.0.1:3306` with database/user/password
`okvns`, matching the Playwright E2E defaults. Use `docker compose down` when
you are done, or `docker compose down -v` to also remove the local MySQL data.

Docker Compose:

```bash
docker compose up --build
```

## Runtime Configuration

| Variable                         | Default                 | Used by                                        |
| -------------------------------- | ----------------------- | ---------------------------------------------- |
| `OKVNS_API_PORT`                 | `3000`                  | API                                            |
| `OKVNS_CORS_ORIGIN`              | `*`                     | API                                            |
| `OKVNS_STORAGE_DRIVER`           | `mysql`                 | API (`mysql` durable, or `memory` non-durable) |
| `OKVNS_MYSQL_HOST`               | _(required for mysql)_  | API + migrations                               |
| `OKVNS_MYSQL_PORT`               | `3306`                  | API + migrations                               |
| `OKVNS_MYSQL_DATABASE`           | _(required for mysql)_  | API + migrations                               |
| `OKVNS_MYSQL_USER`               | _(required for mysql)_  | API + migrations                               |
| `OKVNS_MYSQL_PASSWORD`           | `` (empty)              | API + migrations                               |
| `OKVNS_MYSQL_POOL_LIMIT`         | `10`                    | API connection pool size                       |
| `OKVNS_MYSQL_CONNECT_TIMEOUT_MS` | `10000`                 | API connection timeout                         |
| `VITE_OKVNS_API_BASE_URL`        | `http://localhost:3000` | Admin web local build/dev                      |
| `OKVNS_API_BASE_URL`             | `http://localhost:3000` | Admin web container runtime                    |

When `OKVNS_STORAGE_DRIVER=mysql` (the default), missing `OKVNS_MYSQL_HOST`,
`OKVNS_MYSQL_DATABASE`, or `OKVNS_MYSQL_USER` cause the API to fail startup with
a clear configuration error.

## OpenSpec Workflow

Install the OpenSpec CLI first if you have not (see [step 6 of the Ubuntu setup](#6-openspec-cli-only-for-spec-driven-changes)).

Main specs live under `openspec/specs/`.

Archived change artifacts live under `openspec/changes/archive/`.

When adding or changing capabilities, create a new OpenSpec change before implementation, keep tasks aligned with the specs/design, then sync and archive the change after verification.
