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

| Method | Path                               | Purpose                                                                 |
| ------ | ---------------------------------- | ----------------------------------------------------------------------- |
| GET    | `/health`                          | Liveness probe.                                                         |
| GET    | `/ready`                           | Readiness probe.                                                        |
| GET    | `/namespaces`                      | List namespaces.                                                        |
| POST   | `/namespaces`                      | Create a namespace (`{ "name": "...", "description"? }`).               |
| GET    | `/namespaces/:name`                | Get a namespace with its entries.                                       |
| PUT    | `/namespaces/:name`                | Update a namespace (`{ "name"?, "description"? }`).                     |
| DELETE | `/namespaces/:name`                | Delete a namespace.                                                     |
| GET    | `/namespaces/:name/entries`        | List entries in a namespace.                                            |
| POST   | `/namespaces/:name/entries`        | Create an entry (`{ "name": "...", "value": "...", "description"? }`).  |
| GET    | `/namespaces/:name/entries/:entry` | Get an entry.                                                           |
| PUT    | `/namespaces/:name/entries/:entry` | Update an entry (`{ "name"?, "value"?, "description"? }`).              |
| DELETE | `/namespaces/:name/entries/:entry` | Delete an entry.                                                        |
| POST   | `/yaml/import`                     | Import YAML (`{ "yaml": "..." }` JSON, or multipart file field `file`). |
| GET    | `/yaml/export`                     | Export all namespaces as YAML (`{ "yaml": "..." }`).                    |
| GET    | `/yaml/export/:name`               | Export a single namespace as YAML (`{ "yaml": "..." }`).                |

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
- Entry object: `name`, `value`, optional `description`

Imported descriptions are user-authored data and are persisted (unlike
`created_at`/`modified_at`, which are accepted but ignored). They follow the same
rules as the API: strings of at most 1000 characters, with blanks normalized to
no description.

The importer rejects:

- Unexpected keys
- Duplicate namespaces after normalization
- Duplicate entries in the same namespace after normalization
- Invalid names
- Non-string values
- Non-string or oversized descriptions
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
  - name: settings
    entries: []
```

Export always returns raw YAML using the canonical `namespaces` array shape and deterministic ordering. The exported content is plain YAML, not wrapped in a markdown code fence. `description` is emitted only for namespaces and entries that have one.

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
