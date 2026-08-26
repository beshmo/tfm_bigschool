## 1. Shared Contracts

- [x] 1.1 Add shared paginated response, lightweight namespace list item, and list query types for namespaces and entries.
- [x] 1.2 Define allowlisted page sizes, sort fields, sort directions, and entry environment-dependence filter values.
- [x] 1.3 Update shared package tests for pagination metadata and allowlisted query constants where applicable.

## 2. Application and Repository Layer

- [x] 2.1 Update namespace and entry list use cases to accept validated list query objects and return paginated DTO results.
- [x] 2.2 Update repository ports to support paginated namespace and entry listing with filters, ordering, total counts, limit, and offset.
- [x] 2.3 Implement equivalent filtering, ordering, pagination, and total-count behavior in the in-memory repository.
- [x] 2.4 Implement MySQL list queries using allowlisted SQL fragments, `WHERE`, deterministic `ORDER BY`, `LIMIT`, `OFFSET`, and `COUNT(*)`.
- [x] 2.5 Add or update application, in-memory repository, and MySQL integration tests for page sizes, metadata, ordering, name filters, entry `env_dependent` filters, and missing namespace handling.

## 3. API Layer

- [x] 3.1 Add NestJS query DTOs/pipes for namespace and entry list parameters with validation for page, page size, sort field, sort direction, name filter, and entry `env_dependent`.
- [x] 3.2 Update namespace and entry controllers to return paginated response objects from list endpoints.
- [x] 3.3 Update OpenAPI response schemas and query parameter documentation for paginated namespace and entry lists, including namespace list items without entries.
- [x] 3.4 Update API contract tests to assert the breaking paginated response shape and validation failures for unsupported query values.

## 4. Admin Frontend

- [x] 4.1 Update the frontend API client and fake API to request and expose paginated namespace and entry list responses.
- [x] 4.2 Update the namespace list page to use API-backed name filtering, ordering controls, page navigation, and page-size selection of `10`, `50`, or `100`.
- [x] 4.3 Update the namespace detail entry list to request entries from the entry list endpoint and support API-backed name filtering, `env_dependent` filtering, ordering controls, page navigation, and page-size selection.
- [x] 4.4 Ensure create, update, and delete flows reload the active list query and recover cleanly when a deletion empties the current page.
- [x] 4.5 Update React Testing Library tests for namespace and entry list controls, paginated metadata display, and API query mapping.

## 5. Documentation and E2E

- [x] 5.1 Update API and project documentation to describe the breaking list response shape, query parameters, page-size choices, and migration from raw arrays.
- [x] 5.2 Update Playwright workflows to cover namespace and entry page-size selection, ordering, and filtering through the browser UI.
- [x] 5.3 Run OpenSpec validation for `add-api-backed-list-pagination`.
- [x] 5.4 Run relevant package, API, frontend, and E2E tests for the completed change.
