## Why

Namespace and entry list views currently load complete collections and only support fixed deterministic ordering. As OKVNS data grows, the admin frontend needs API-backed pagination, ordering, and filtering so operators can work with large lists without fetching or rendering every row.

## What Changes

- **BREAKING**: Change namespace and entry list API responses from raw arrays to paginated result objects containing `items`, `page`, `page_size`, `total_items`, and `total_pages`.
- **BREAKING**: Change namespace list items to lightweight namespace summaries that omit the full `entries` array; clients must use namespace detail or the paginated entry list endpoint to read entries.
- Add list query parameters for page number, page size, sort field, sort direction, and name filtering.
- Add entry-only list support for filtering and ordering by `env_dependent`.
- Restrict frontend-selectable page sizes to `10`, `50`, and `100`.
- Update the admin namespace list and namespace entry list to drive pagination, ordering, and filtering through API queries instead of local array slicing.
- Update documentation, OpenAPI schemas, contract tests, frontend component tests, and E2E coverage for the new list behavior.

## Capabilities

### New Capabilities

None.

### Modified Capabilities

- `namespace-management`: Namespace listing becomes paginated, filterable by name, and orderable by name and timestamp fields.
- `entry-management`: Entry listing becomes paginated, filterable by name and environment-dependence, and orderable by name, timestamp fields, and environment-dependence.
- `admin-frontend`: Admin list views expose API-backed controls for pagination size, ordering, and filtering.
- `api-documentation`: API documentation describes the breaking paginated list response shape and list query parameters.

## Impact

- Shared DTO types in `packages/shared`.
- Application list use cases and repository ports in `packages/application`.
- MySQL and in-memory repository list behavior in `apps/api/src/infrastructure`.
- NestJS controllers, query DTOs, OpenAPI schemas, and API contract tests in `apps/api`.
- Admin API client, namespace list page, namespace detail entry list, component tests, and Playwright workflows in `apps/admin-web` and `e2e`.
- Public API consumers must update from array list responses to paginated result responses.
