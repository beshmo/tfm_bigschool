# ADR-0004: Use a Strict OKVNS Markdown Contract

## Status

Accepted

## Context

OKVNS supports bulk import and export through markdown containing YAML. Imports mutate namespace state, so invalid input must be rejected before any storage changes occur.

The project also needs compatibility with the original single-namespace shape while making the canonical multi-namespace shape clear.

## Decision

Use a strict markdown/YAML contract.

The canonical export shape is:

```yaml
namespaces:
  - name: example
    entries:
      - name: key
        value: value
```

Import accepts the canonical `namespaces: [...]` shape and the legacy single `namespace: ...` shape. Export always emits canonical `namespaces: [...]`.

The importer validates the full document before mutating storage and rejects unexpected keys, duplicate namespaces, duplicate entries, invalid names, non-string values, oversized payloads, invalid YAML, and invalid OKVNS shapes.

## Consequences

- Import behavior is deterministic and atomic from the caller's perspective.
- Exported documents have one stable canonical shape.
- Compatibility exists for the legacy single-namespace shape.
- The parser must keep validation strict and well covered by tests.

