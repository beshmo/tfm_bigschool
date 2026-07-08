# API And Markdown Reference

## API Endpoints

| Method | Path | Purpose |
| --- | --- | --- |
| GET | `/health` | Liveness probe. |
| GET | `/ready` | Readiness probe. |
| GET | `/namespaces` | List namespaces. |
| POST | `/namespaces` | Create a namespace (`{ "name": "..." }`). |
| GET | `/namespaces/:name` | Get a namespace with its entries. |
| PUT | `/namespaces/:name` | Rename a namespace (`{ "name": "..." }`). |
| DELETE | `/namespaces/:name` | Delete a namespace. |
| GET | `/namespaces/:name/entries` | List entries in a namespace. |
| POST | `/namespaces/:name/entries` | Create an entry (`{ "name": "...", "value": "..." }`). |
| GET | `/namespaces/:name/entries/:entry` | Get an entry. |
| PUT | `/namespaces/:name/entries/:entry` | Update an entry (`{ "name"?, "value"? }`). |
| DELETE | `/namespaces/:name/entries/:entry` | Delete an entry. |
| POST | `/markdown/import` | Import markdown (`{ "markdown": "..." }`). |
| GET | `/markdown/export` | Export all namespaces as markdown. |
| GET | `/markdown/export/:name` | Export a single namespace as markdown. |

## Names

Namespace and entry names must be trimmed, non-empty UTF-8 strings matching:

```text
^[\p{L}\p{N}][\p{L}\p{N}._-]*$
```

Names are limited to 128 characters after trimming.

## Error Shape

Errors use a safe shape and never leak stack traces or implementation details:

```json
{ "error": { "code": "DUPLICATE_NAMESPACE", "message": "...", "details": ["..."] } }
```

## Markdown Import

The canonical shape uses a `namespaces` array. The original single `namespace` object shape is also accepted on import for compatibility.

Content may optionally be wrapped in a YAML code fence.

Only these keys are allowed:

- Root: `namespaces` or `namespace`, but not both
- Namespace object: `name`, `entries`
- Entry object: `name`, `value`

The importer rejects:

- Unexpected keys
- Duplicate namespaces after normalization
- Duplicate entries in the same namespace after normalization
- Invalid names
- Non-string values
- Oversized payloads
- Invalid YAML or invalid OKVNS shapes

Import validates the full document before mutating storage. Valid imports upsert by namespace name: imported namespaces are created when missing and replace entries when already present.

## Canonical Markdown Example

```yaml
namespaces:
  - name: users
    entries:
      - name: admin
        value: secret
  - name: settings
    entries: []
```

Export always uses the canonical `namespaces` array shape and deterministic ordering.
