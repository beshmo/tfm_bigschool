## MODIFIED Requirements

### Requirement: Kubernetes namespace and workloads
The project SHALL provide baseline Kubernetes manifests and a Helm chart that deploy OKVNS resources into a single `okvns` namespace and configure the API to use MySQL-backed persistent storage.

#### Scenario: Kubernetes namespace is applied
- **WHEN** the Kubernetes manifests are applied
- **THEN** the `okvns` namespace, API workload, admin frontend workload, services, and required MySQL storage configuration are created

#### Scenario: Kubernetes manifests use published image defaults
- **WHEN** the Kubernetes manifests are applied without local image overrides
- **THEN** the API workload and its migration init container use `beshmo/okvns:okvns-api-1.0.0`
- **THEN** the admin frontend workload uses `beshmo/okvns:okvns-admin-web-1.0.0`

#### Scenario: Helm chart renders equivalent workloads
- **WHEN** the Helm chart is rendered with default values
- **THEN** it includes the namespace, API workload, admin frontend workload, services, and required MySQL storage configuration
- **THEN** the API workload and its migration init container use `beshmo/okvns:okvns-api-1.0.0`
- **THEN** the admin frontend workload uses `beshmo/okvns:okvns-admin-web-1.0.0`

#### Scenario: Helm namespace template is enabled by default
- **WHEN** the Helm chart is rendered with default values
- **THEN** it includes a Namespace resource for `okvns`

#### Scenario: Helm namespace template can be disabled
- **WHEN** the Helm chart is rendered with namespace creation disabled
- **THEN** it does not include a Namespace resource
- **THEN** namespaced resources still target the configured namespace
