# API And YAML Reference

## Generated API Documentation

When the API is running, it also serves generated OpenAPI/Swagger documentation
built from the NestJS controllers:

- **Swagger UI:** `http://localhost:3000/docs` — interactive endpoint explorer.
- **Raw OpenAPI JSON:** `http://localhost:3000/docs-json` — machine-readable
  contract for client generation and tooling.

The generated document reflects the implemented routes, request/response
schemas, path parameters, multipart YAML upload, and the safe error shape. This
Markdown reference remains the source of truth for YAML semantics, error codes,
and migration notes described below.

## API Endpoints

| Method | Path                               | Purpose                                                                                  |
| ------ | ---------------------------------- | ---------------------------------------------------------------------------------------- |
| GET    | `/health`                          | Liveness probe.                                                                          |
| GET    | `/ready`                           | Readiness probe.                                                                         |
| GET    | `/namespaces`                      | List namespaces as a page (see [List Pagination](#list-pagination)).                     |
| POST   | `/namespaces`                      | Create a namespace (`{ "name": "...", "description"? }`).                                |
| GET    | `/namespaces/:name`                | Get a namespace with its entries.                                                        |
| PUT    | `/namespaces/:name`                | Update a namespace (`{ "name"?, "description"? }`).                                      |
| DELETE | `/namespaces/:name`                | Delete a namespace.                                                                      |
| GET    | `/namespaces/:name/entries`        | List entries in a namespace as a page (see [List Pagination](#list-pagination)).         |
| POST   | `/namespaces/:name/entries`        | Create an entry (`{ "name": "...", "value": "...", "description"?, "env_dependent"? }`). |
| GET    | `/namespaces/:name/entries/:entry` | Get an entry.                                                                            |
| PUT    | `/namespaces/:name/entries/:entry` | Update an entry (`{ "name"?, "value"?, "description"?, "env_dependent"? }`).             |
| DELETE | `/namespaces/:name/entries/:entry` | Delete an entry.                                                                         |
| POST   | `/yaml/import`                     | Import YAML (`{ "yaml": "..." }` JSON, or multipart file field `file`).                  |
| GET    | `/yaml/export`                     | Export all namespaces as YAML (`{ "yaml": "..." }`).                                     |
| GET    | `/yaml/export/:name`               | Export a single namespace as YAML (`{ "yaml": "..." }`).                                 |

## List Pagination

The two list endpoints — `GET /namespaces` and `GET /namespaces/:name/entries` —
return one page of results plus metadata describing the full result set:

```json
{
  "items": [],
  "page": 1,
  "page_size": 10,
  "total_items": 42,
  "total_pages": 5
}
```

- `page` is 1-based. `total_items` counts every item matching the query across
  all pages, ignoring pagination; `total_pages` is `0` when nothing matched, so
  an empty result set is distinguishable from a single empty page.
- Requesting a page past the end returns an empty `items` with the true totals,
  not an error.

### Query parameters

| Parameter       | Applies to | Values                                               | Default |
| --------------- | ---------- | ---------------------------------------------------- | ------- |
| `page`          | both       | Any integer ≥ 1                                      | `1`     |
| `page_size`     | both       | `10`, `50`, or `100`                                 | `10`    |
| `sort`          | namespaces | `name`, `created_at`, `modified_at`                  | `name`  |
| `sort`          | entries    | `name`, `created_at`, `modified_at`, `env_dependent` | `name`  |
| `direction`     | both       | `asc`, `desc`                                        | `asc`   |
| `name`          | both       | Case-insensitive "contains" filter on the name       | none    |
| `env_dependent` | entries    | `true` or `false`; omit to return all entries        | none    |

Page sizes, sort fields, and directions are **allowlisted**: any other value is
rejected with a `VALIDATION_ERROR` before the list query runs. `page_size=25` and
`sort=value` are errors, not silently-clamped or ignored inputs.

Ordering is deterministic. When rows tie on the primary sort field — two
namespaces created in the same second, or entries sharing an `env_dependent`
value — the tie breaks on ascending name, so a page boundary never splits rows
that compare equal.

Filtering by `name` matches a substring case-insensitively, and the filter text
is matched literally: a `%` or `_` in the filter is not a wildcard.

### Migrating from array list responses

**Breaking change.** Both list endpoints previously returned a bare JSON array.
They now return the object above, and namespace list items no longer carry
`entries`.

- Read `response.items` where you previously used the array directly.
- Namespace list items carry `name`, optional `description`, `created_at`, and
  `modified_at` — but not `entries`. A page of namespaces would otherwise include
  every entry of every namespace on it, which defeats paging. Fetch entries from
  `GET /namespaces/:name/entries`, or the whole aggregate from
  `GET /namespaces/:name`, which still returns its `entries`.
- Clients that relied on receiving _every_ namespace or entry in one response now
  get only the first page. Either request `page_size=100`, or page until
  `page` reaches `total_pages`. YAML export (`GET /yaml/export`) is unpaginated
  and still returns the whole dataset.

## Names

Namespace and entry names must be trimmed, non-empty UTF-8 strings matching:

```text
^[\p{L}\p{N}][\p{L}\p{N}._-]*$
```

Names are limited to 128 characters after trimming.

## Descriptions

Namespaces and entries carry an optional `description`: short, human-facing
documentation about what the resource is for.

- Descriptions are optional everywhere: on create, on update, in YAML, and in
  responses. A resource with no description omits the field entirely rather than
  returning an empty string.
- Descriptions must be strings of at most **1000 characters** after trimming.
  Non-string or oversized descriptions are rejected at the API and YAML
  boundaries with `VALIDATION_ERROR` / `INVALID_YAML` before anything is stored.
- Values are trimmed, and a blank or whitespace-only description is normalized to
  _no description_. Sending `{ "description": "  " }` on update therefore clears a
  stored description.
- On update, an omitted `description` leaves the stored one unchanged. `PUT
/namespaces/:name` must contain a `name`, a `description`, or both; an empty
  body is rejected with `VALIDATION_ERROR`.
- Changing a description counts as a modification: it refreshes the resource's
  `modified_at`, and an entry description change also refreshes its namespace's
  aggregate `modified_at`.

## Environment-dependent entries

Entries carry an `env_dependent` boolean marking a value that is only valid in
one deployment environment, so it can be found and reviewed after a namespace is
exported from one environment and imported into another.

- The marker is metadata only. OKVNS never rewrites, substitutes, or validates
  the value it marks; adjusting a flagged value stays an explicit admin action.
- It is always present in responses. Omitting it on create stores `false`, and
  entries stored before the field existed read back as `false`, so clients never
  have to distinguish missing from false.
- Only booleans are accepted. A non-boolean — including a quoted `"true"` in a
  hand-edited YAML file — is rejected at the API and YAML boundaries with
  `VALIDATION_ERROR` / `INVALID_YAML` before anything is stored.
- On update, an omitted `env_dependent` leaves the stored value unchanged; send
  `false` to clear the marker.
- Changing the marker counts as a modification: it refreshes the entry's
  `modified_at` and its namespace's aggregate `modified_at`.

## Error Shape

Errors use a safe shape and never leak stack traces or implementation details:

```json
{ "error": { "code": "DUPLICATE_NAMESPACE", "message": "...", "details": ["..."] } }
```

Invalid YAML content or shapes surface as `INVALID_YAML` with HTTP 400.

## YAML Import

The canonical shape uses a `namespaces` array. The original single `namespace` object shape is also accepted on import for compatibility.

Import content must be raw YAML; it is not wrapped in a code fence.

### Request Formats

`POST /yaml/import` accepts the YAML document in either of two formats:

- **JSON body** (`application/json`): `{ "yaml": "<raw YAML>" }`.
- **Multipart upload** (`multipart/form-data`): a single file field named `file`
  whose content is the UTF-8 OKVNS YAML document.

Both formats route through the same importer, so validation, atomicity, upsert
semantics, and the successful response shape (`{ "namespaces": [...] }`) are
identical regardless of which format is used.

The uploaded file is held in memory only for the duration of the request; no
file is written to disk. Uploads larger than the configured import payload limit
(1 MiB) are rejected before parsing with a safe HTTP 413 Payload Too Large error
(code `VALIDATION_ERROR`). Missing, empty, unreadable, or otherwise invalid
uploaded content is rejected as `INVALID_YAML` (HTTP 400) without mutating
storage.

Only these keys are allowed:

- Root: `namespaces` or `namespace`, but not both
- Namespace object: `name`, `entries`, optional `description`
- Entry object: `name`, `value`, optional `description`, optional `env_dependent`

Imported descriptions and `env_dependent` markers are user-authored data and are
persisted (unlike `created_at`/`modified_at`, which are accepted but ignored).
They follow the same rules as the API: descriptions are strings of at most 1000
characters with blanks normalized to no description, and `env_dependent` must be
a boolean, defaulting to `false` when omitted.

The importer rejects:

- Unexpected keys
- Duplicate namespaces after normalization
- Duplicate entries in the same namespace after normalization
- Invalid names
- Non-string values
- Non-string or oversized descriptions
- Non-boolean entry `env_dependent` values
- Oversized payloads
- Invalid YAML or invalid OKVNS shapes

Import validates the full document before mutating storage. Valid imports upsert by namespace name: imported namespaces are created when missing and replace entries when already present.

## Canonical YAML Example

```yaml
namespaces:
  - name: users
    description: Accounts for the admin console.
    entries:
      - name: admin
        value: secret
        description: API key used by the admin console.
        env_dependent: false
      - name: db-host
        value: db.prod.internal
        env_dependent: true
  - name: settings
    entries: []
```

Export always returns raw YAML using the canonical `namespaces` array shape and deterministic ordering. The exported content is plain YAML, not wrapped in a markdown code fence. `description` is emitted only for namespaces and entries that have one, while entry `env_dependent` is emitted for every entry — including `false` — so an exported file can be audited for environment-specific values without inferring anything from an absent key.

## Migration From The Markdown Contract

This bulk import/export contract replaces the previous markdown contract. The change is breaking:

| Before (markdown)                          | After (YAML)                       |
| ------------------------------------------ | ---------------------------------- |
| `POST /markdown/import`                    | `POST /yaml/import`                |
| `GET /markdown/export`                     | `GET /yaml/export`                 |
| `GET /markdown/export/:name`               | `GET /yaml/export/:name`           |
| Request field `{ "markdown": "..." }`      | Request field `{ "yaml": "..." }`  |
| Response field `{ "markdown": "..." }`     | Response field `{ "yaml": "..." }` |
| Export wrapped in a ` ```yaml ` code fence | Raw YAML, no code fence            |
| Error code `INVALID_MARKDOWN`              | Error code `INVALID_YAML`          |

Clients must switch to the `/yaml/*` routes, send and read the `yaml` field, stop parsing fenced output, and handle `INVALID_YAML` instead of `INVALID_MARKDOWN`.
