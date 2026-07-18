# Release v1.0.1 — TFM asset delivery

Minor release that finalizes the TFM (Trabajo Fin de Máster) deliverables for
OKVNS and republishes the production Docker images for the API and admin
frontend.

## Highlights since v1.0.0

- **Demo web app** (`apps/demo-web`) drives its content from the `demo-consumer`
  namespace through `@okvns/wrapper`, illustrating external consumption of the
  service (#34).
- **TFM project documentation** consolidated under `docs/tfm/`, including the
  defense presentation and the project overview (#29, #31).
- **Admin web** now renders its release version in the footer (#30).
- **Helm deployment chart** (`deploy/helm/okvns`) added as a configurable
  equivalent to the reference Kubernetes manifests (#27).
- **DigitalOcean deployment fixes**: block-storage storage class and DOKS
  deployment adjustments (#28, #32).

## Version alignment

| Component            | Version |
| -------------------- | ------- |
| Workspace root       | `1.0.1` |
| `@okvns/api`         | `1.0.1` |
| `@okvns/admin-web`   | `1.0.1` |
| `@okvns/demo-web`    | `1.0.1` |
| API OpenAPI document | `1.0.1` |
| Helm chart           | `0.1.1` |
| Helm `appVersion`    | `1.0.1` |

## Published images

The `v1.0.1` Git tag triggers CI to build and push the production images to the
public Docker Hub repository `beshmo/okvns`:

- `beshmo/okvns:okvns-api-1.0.1`
- `beshmo/okvns:okvns-admin-web-1.0.1`

The `demo-web` image stays out of the production publishing flow; it is built
and run locally (`docker-compose.demo.yml`) pointed at the published API.

The reference Kubernetes manifests (`deploy/k8s/`) and the Helm chart already
default to the `1.0.1` image tags.

## How the images are generated

Publishing is driven entirely by CI (`.github/workflows/ci.yml`) when a `v*`
tag is pushed:

```bash
git tag -a v1.0.1 -m "OKVNS v1.0.1 — TFM asset delivery"
git push origin v1.0.1
```
