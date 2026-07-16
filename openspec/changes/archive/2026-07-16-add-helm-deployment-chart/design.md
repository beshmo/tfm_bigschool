## Context

OKVNS already has baseline Kubernetes manifests under `deploy/k8s` for the namespace, MySQL, API, admin frontend, services, config, and ingress placeholder. Those manifests still default to local image names, while CI publishes production images to the public Docker Hub repository `beshmo/okvns` using asset-prefixed tags.

The project needs a repeatable Helm installation path without changing the runtime architecture: one API workload, one admin frontend workload, MySQL-backed persistence, ConfigMaps for non-sensitive settings, Secrets for MySQL credentials, probes, and optional ingress.

## Goals / Non-Goals

**Goals:**

- Make raw Kubernetes manifests deploy the requested production image tags by default.
- Add a Helm chart that represents the same resources and defaults as the raw manifests.
- Expose practical deployment knobs through `values.yaml` without adding new runtime components.
- Include namespace creation in the chart as an optional template, enabled by default.
- Document Helm usage and how it relates to the existing `kubectl apply` workflow.

**Non-Goals:**

- Do not change the API, admin frontend, or persistence behavior.
- Do not replace MySQL with another backing service.
- Do not introduce Redis, queues, workers, service mesh resources, or external secret operators.
- Do not publish the Helm chart to a remote chart repository in this change.

## Decisions

### Use published Docker Hub images as deployment defaults

The raw Kubernetes manifests and Helm defaults will use `beshmo/okvns:okvns-api-1.0.0` for the API and migrate init container, and `beshmo/okvns:okvns-admin-web-1.0.0` for the admin frontend.

Alternative considered: keep local `okvns/api:latest` and `okvns/admin-web:latest` defaults. Rejected because the requested deployment target is the already-published Docker Hub images, and local image tags make cluster deployment depend on a manual image load step.

### Keep raw manifests and Helm chart side by side

The existing `deploy/k8s` manifests remain as the simple reference deployment path. The new Helm chart will live under `deploy/helm/okvns` and template the same resources.

Alternative considered: replace raw manifests with Helm only. Rejected because raw manifests are useful for simple inspection, coursework review, and direct `kubectl apply` workflows.

### Provide an optional namespace template enabled by default

The chart will include a namespace template controlled by `namespace.create`, defaulting to `true`, with `namespace.name` defaulting to `okvns`. Namespaced resources will render into that configured namespace.

Alternative considered: require `helm install -n okvns --create-namespace` and omit a namespace template. Rejected because the current raw manifest set includes `00-namespace.yaml`; enabled-by-default namespace templating is the closest Helm equivalent.

### Use chart-local templates instead of generating Helm from YAML at runtime

Implementation will create maintainable Helm templates derived from the current manifests. Shared labels, names, and namespace values can be centralized in `_helpers.tpl`.

Alternative considered: use an automated conversion tool and commit the output without cleanup. Rejected because generated templates often need review for stable names, values structure, and maintainability.

### Keep secrets simple and visible for the reference deployment

The chart will template the same placeholder MySQL Secret values used by the raw manifests, with values configurable in `values.yaml`. Documentation will continue to warn users to replace placeholders before real deployment.

Alternative considered: require users to provide an existing Secret. Rejected as the only default because it makes first-run installation less direct; an existing-secret option can be added later if needed.

## Risks / Trade-offs

- Published version tags may become stale as new releases are cut -> Keep image tags configurable in Helm values and document where to change raw manifest tags.
- Helm and raw manifests can drift over time -> Derive chart resources from the current manifests during implementation and document both deployment paths together.
- A namespace template can conflict with cluster policies or externally managed namespaces -> Make it optional with `namespace.create=false`.
- Committing placeholder secrets is not production-safe -> Preserve the current reference-deployment pattern and document replacement before real deployment.

## Migration Plan

Existing `kubectl apply -f deploy/k8s/` users can continue using raw manifests and will pull Docker Hub images by default instead of relying on local cluster images. Helm users can install the chart with default values for a reference deployment or override values for environment-specific settings.

Rollback is straightforward: revert the manifest image tag changes and remove or stop using the Helm chart. No data migration is involved.

## Open Questions

- None.
