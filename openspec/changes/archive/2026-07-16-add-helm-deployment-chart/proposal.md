## Why

The Kubernetes deployment currently defaults to local image names even though production images are published to Docker Hub. The project also has raw Kubernetes manifests but no Helm chart, which makes repeatable installation and environment-specific overrides harder.

## What Changes

- Update the baseline Kubernetes manifests to use the published Docker Hub images `beshmo/okvns:okvns-api-1.0.0` and `beshmo/okvns:okvns-admin-web-1.0.0`.
- Add a Helm chart generated from the existing Kubernetes resources.
- Make the Helm chart image repositories, tags, pull policies, replica counts, runtime configuration, secrets, resources, persistence, and ingress settings configurable through `values.yaml`.
- Include an optional namespace template in the Helm chart, enabled by default.
- Document Helm installation alongside the existing `kubectl apply` workflow.

## Capabilities

### New Capabilities

- None.

### Modified Capabilities

- `deployment-foundation`: Kubernetes deployment requirements now include published Docker Hub image defaults and an equivalent Helm chart with an optional namespace template enabled by default.

## Impact

- Affects `deploy/k8s` Kubernetes manifests.
- Adds a new Helm chart under `deploy/helm`.
- Updates deployment documentation.
- No application API or runtime behavior changes are expected outside deployment configuration.
