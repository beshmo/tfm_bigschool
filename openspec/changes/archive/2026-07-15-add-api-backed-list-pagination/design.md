## Context

The current list APIs return raw arrays: `GET /namespaces` returns `NamespaceDto[]`, and `GET /namespaces/:namespace/entries` returns `EntryDto[]`. The application layer sorts namespaces and entries by name, the MySQL adapter also orders by name, and the admin frontend fetches full collections before rendering or filtering.

The requested direction is API-backed pagination using option 3 from exploration: make a breaking contract change so list endpoints return a paginated response object instead of preserving array responses.

## Goals / Non-Goals

**Goals:**

- Provide API-backed pagination for namespace and entry list endpoints.
- Support frontend-selectable page sizes of `10`, `50`, and `100`.
- Support ordering namespaces by `name`, `created_at`, and `modified_at`.
- Support ordering entries by `name`, `created_at`, `modified_at`, and `env_dependent`.
- Support name filtering for namespaces and entries.
- Support entry-only filtering by `env_dependent`.
- Keep list behavior deterministic by applying a stable secondary name order when the primary sort field has ties.
- Update the admin frontend to use query-backed list state instead of fetching all rows for list display.

**Non-Goals:**

- No authentication, authorization, or per-user saved list preferences.
- No cursor pagination; offset/page-number pagination is sufficient for the admin workflows.
- No full-text search or filtering by description/value.
- No changes to YAML import/export ordering or payload shape.
- No new persistence technology or ORM.

## Decisions

1. Use a shared paginated response DTO with lightweight namespace list items.

   List endpoints will return `{ items, page, page_size, total_items, total_pages }`. This replaces array responses and makes the contract explicit for every list consumer. Namespace list responses will use lightweight namespace items containing namespace metadata but no `entries` array; clients that need entries must call `GET /namespaces/:name` for aggregate detail or `GET /namespaces/:name/entries` for the paginated entry list.

   Alternative considered: preserve raw arrays when query parameters are absent. Rejected because the user selected option 3, and a single response shape avoids dual client/server paths.

2. Use page-number pagination with allowlisted page sizes.

   Query parameters will include `page` and `page_size`, where `page` is 1-based and `page_size` MUST be one of `10`, `50`, or `100`. The frontend will expose those same page-size choices.

   Alternative considered: cursor pagination. Rejected because these admin lists need simple page navigation and total counts; cursor pagination would add complexity without clear value for the current product.

3. Keep sort and filter fields allowlisted at the API boundary.

   Namespace sort fields are `name`, `created_at`, and `modified_at`. Entry sort fields are `name`, `created_at`, `modified_at`, and `env_dependent`. Sort direction is `asc` or `desc`. Name filters perform a case-insensitive contains match. Entry `env_dependent` filter accepts `true` or `false` and is omitted for all entries.

   Alternative considered: pass arbitrary sort/filter field names to repositories. Rejected because it risks SQL injection, inconsistent in-memory behavior, and unclear OpenAPI documentation.

4. Push pagination into repository list operations.

   Application use cases will accept normalized list query objects and return paginated DTOs. Repository ports will support list queries that can be implemented efficiently by MySQL using `WHERE`, `ORDER BY`, `LIMIT`, `OFFSET`, and `COUNT(*)`. The in-memory adapter will mirror the same semantics for tests and local memory mode.

   Alternative considered: fetch all entities in the use case and paginate in memory. Rejected because it keeps the current scalability problem and makes MySQL indexes less useful.

5. Retrieve entry pages through the entries list endpoint.

   `GET /namespaces/:name` can continue returning a full namespace detail with entries for compatibility with existing detail semantics, but the admin entry list will call `GET /namespaces/:name/entries` for paginated entry display.

   Alternative considered: paginate entries inside the namespace detail endpoint. Rejected because it mixes aggregate retrieval with list browsing and complicates the namespace response shape.

6. Keep namespace list and namespace detail response types distinct.

   The namespace list endpoint will return `NamespaceListItemDto` items, while namespace detail will continue returning `NamespaceDto` with entries. This prevents a paginated namespace page from accidentally carrying unbounded entry collections.

   Alternative considered: return `NamespaceDto` inside the paginated namespace list and leave `entries` empty or partial. Rejected because empty or partial entries would be misleading, while full entries would defeat API-backed pagination.

## Risks / Trade-offs

- Breaking API responses can break external clients -> document the migration clearly and update all internal API clients/tests in the same change.
- Offset pagination can produce page drift if rows are added or deleted while browsing -> acceptable for admin CRUD lists; deterministic ordering and reload-after-mutation reduce confusion.
- Case-insensitive name filtering differs by database collation -> normalize semantics in tests and use explicit SQL behavior where needed.
- Sorting by timestamp fields can produce ties -> use secondary `name` ordering so page results remain stable.
- Counting rows adds query cost -> list endpoints are admin-facing and filtered by simple indexed fields; revisit only if counts become a performance issue.
