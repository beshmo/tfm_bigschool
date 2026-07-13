# @okvns/wrapper

A small, framework-independent TypeScript client for **external applications**
that read configuration-style values from an **already-running** OKVNS API. It
wraps a single endpoint — `GET /namespaces/:namespace/entries/:entry` — and adds
URL building, path encoding, not-found fallback, and typed error handling.

It does not depend on NestJS, React, MySQL, or the admin frontend, and it adds no
HTTP client dependency: it uses the runtime's global `fetch` (or one you inject).

## Basic usage

```ts
import { OkvnsWrapper } from '@okvns/wrapper';

const okvns = new OkvnsWrapper({ baseUrl: 'https://okvns.example.com' });

// Reads GET https://okvns.example.com/namespaces/billing/entries/timeout
const timeout = await okvns.read('billing', 'timeout', '30s');
```

`read(namespace, entry, defaultValue)` returns a `Promise<string>`:

- The stored **value** when the entry exists.
- The provided **`defaultValue`** when the namespace or entry does not exist.

Namespace and entry names are URL-encoded for you, and trailing slashes on
`baseUrl` are normalized, so `https://okvns.example.com/` and
`https://okvns.example.com` behave identically.

### Injecting a fetch implementation

By default the wrapper uses the runtime global `fetch` (available in Node.js 22+
and browsers). You can inject a custom implementation for tests or runtimes that
lack a global fetch:

```ts
const okvns = new OkvnsWrapper({
  baseUrl: 'https://okvns.example.com',
  fetch: myFetch,
});
```

## Behavior contract

### Missing values return the default

Reads for a **missing namespace** or **missing entry** are treated as
configuration misses and resolve to `defaultValue` — they do **not** throw. This
covers the API's `NAMESPACE_NOT_FOUND` and `ENTRY_NOT_FOUND` responses, and any
`404` whose error body cannot be parsed.

### Everything else throws a typed error

All other failures reject with an `OkvnsWrapperError` subclass so you can branch
on `error.kind` (or `instanceof`) instead of parsing messages:

| Error                          | `kind`                | When                                                        |
| ------------------------------ | --------------------- | ----------------------------------------------------------- |
| `OkvnsConfigurationError`      | `configuration`       | No fetch available (none injected and no global `fetch`).   |
| `OkvnsNetworkError`            | `network`             | The request failed before any response (carries `cause`).   |
| `OkvnsValidationError`         | `validation`          | The API rejected the request (`VALIDATION_ERROR`).          |
| `OkvnsServerError`             | `server`              | The API responded with a 5xx failure (carries `status`).    |
| `OkvnsInvalidResponseError`    | `invalid-response`    | A success response had no string `value` or was unreadable. |
| `OkvnsUnexpectedResponseError` | `unexpected-response` | Any other unexpected error response (carries `status`).     |

```ts
import { OkvnsWrapperError, OkvnsNetworkError } from '@okvns/wrapper';

try {
  const value = await okvns.read('billing', 'timeout', '30s');
} catch (error) {
  if (error instanceof OkvnsNetworkError) {
    // the OKVNS stack is unreachable — surface an outage, do not silently default
  } else if (error instanceof OkvnsWrapperError) {
    console.error(error.kind, error.message);
  }
}
```

Not-found responses intentionally do **not** throw — they are the default-value
path, so outages and invalid configuration stay visible while missing keys fall
back cleanly.

> **Browser consumers:** the wrapper calls your OKVNS stack directly, so
> cross-origin reads depend on that stack's CORS configuration.

## Scope

This first wrapper is intentionally narrow: **read only**. It does not add auth,
retries, caching, batching, writes, or YAML import/export. See
`openspec/changes/add-okvns-wrapper-library/` for the design rationale.
