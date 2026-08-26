## 1. Kubernetes Manifest Updates

- [x] 1.1 Update the API Deployment and migrate init container images in `deploy/k8s/20-api.yaml` to `beshmo/okvns:okvns-api-1.0.0`.
- [x] 1.2 Update the admin frontend Deployment image in `deploy/k8s/40-web.yaml` to `beshmo/okvns:okvns-admin-web-1.0.0`.
- [x] 1.3 Refresh Kubernetes deployment documentation so raw manifest usage references the Docker Hub image defaults instead of local image loading as the primary path.

## 2. Helm Chart

- [x] 2.1 Create `deploy/helm/okvns/Chart.yaml` with chart metadata for the OKVNS reference deployment.
- [x] 2.2 Create `deploy/helm/okvns/values.yaml` with configurable namespace, image, replica, config, secret, resource, persistence, service, and ingress defaults.
- [x] 2.3 Add Helm helper templates for stable names, labels, selectors, and namespace resolution.
- [x] 2.4 Add a Namespace template controlled by `namespace.create`, enabled by default.
- [x] 2.5 Add MySQL Secret, Service, and StatefulSet templates equivalent to the raw manifests.
- [x] 2.6 Add API ConfigMap, Deployment, Service, migrate init container, probes, environment, and resource templates equivalent to the raw manifests.
- [x] 2.7 Add admin frontend ConfigMap, Deployment, Service, probes, environment, and resource templates equivalent to the raw manifests.
- [x] 2.8 Add an optional Ingress template equivalent to the placeholder raw manifest behavior.

## 3. Verification and Documentation

- [x] 3.1 Run Helm template rendering with default values and verify it includes the namespace, MySQL, API, admin frontend, services, and expected image tags.
- [x] 3.2 Run Helm template rendering with `namespace.create=false` and verify the Namespace resource is omitted while namespaced resources still target the configured namespace.
- [x] 3.3 Validate raw Kubernetes manifests and rendered Helm output with available local tooling.
- [x] 3.4 Document Helm installation, namespace behavior, image overrides, and placeholder secret replacement in deployment documentation.
