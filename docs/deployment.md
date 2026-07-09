# Deployment

OKVNS supports local Docker Compose usage and reference Kubernetes manifests.

State is in-memory only. Restarting the API process or pod clears all namespaces and entries.

## Docker Compose

Run the local platform:

```bash
docker compose up --build
```

Services:

| Service   | URL                     |
| --------- | ----------------------- |
| API       | `http://localhost:3000` |
| Admin web | `http://localhost:8080` |

The Compose file starts one API container and one admin frontend container. It does not start databases, Redis, queues, persistent volumes, or secrets.

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
- API ConfigMap, Deployment, and Service
- Admin frontend ConfigMap, Deployment, and Service
- API health and readiness probes
- A placeholder Ingress in `deploy/k8s/50-ingress.yaml`

## Configuration

Non-sensitive runtime configuration is supplied through environment variables and Kubernetes ConfigMaps.

The first implementation does not require Kubernetes Secrets because it has no authentication, database, Redis, queue, or external credentials.

## Deployment Constraints

- Do not add persistent volumes for the MVP in-memory store.
- Do not imply data durability until a persistent storage change is implemented.
- Do not introduce databases, Redis, queues, workers, or Kubernetes Secrets without a new design/spec change.
