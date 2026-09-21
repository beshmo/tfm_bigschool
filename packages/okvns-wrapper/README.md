# @okvns/wrapper

A small, framework-independent TypeScript client for **reading** entry values from
an already-running OKVNS API. It depends only on `@okvns/shared` and a
fetch-compatible function.

## Basic usage

```ts
import { OkvnsWrapper } from '@okvns/wrapper';

const okvns = new OkvnsWrapper({ baseUrl: 'http://localhost:3000' });

// Resolves to the stored value, or to the default when it does not exist.
const header = await okvns.read('demo-consumer', 'header', 'Hello');
```

`read(namespace, entry, defaultValue)` calls
`GET /namespaces/:namespace/entries/:entry`. Both path segments are URL-encoded,
and trailing slashes on `baseUrl` are ignored.

## Default on miss

When the API reports that the **namespace** (`NAMESPACE_NOT_FOUND`) or the
**entry** (`ENTRY_NOT_FOUND`) does not exist, `read` resolves to the
`defaultValue` you passed. Every other failure rejects with a typed error; the
default is never used to hide an outage.

## Fetch injection

The wrapper uses the runtime's global `fetch` (bound to `globalThis`) unless you
inject one, which is useful for tests, older runtimes or custom headers:

```ts
const okvns = new OkvnsWrapper({
  baseUrl: 'https://okvns.example.com',
  fetch: (input, init) => fetch(input, { ...init, credentials: 'include' }),
});
```

Any function matching `FetchLike` works: it receives the URL and
`{ method, headers }` and resolves to an object with `ok`, `status` and
`json()`.

## Errors

Every error extends the abstract `OkvnsWrapperError` and has a `kind` field.

| Class                          | `kind`                | When                                                         | Extra fields |
| ------------------------------ | --------------------- | ------------------------------------------------------------ | ------------ |
| `OkvnsConfigurationError`      | `configuration`       | Empty `baseUrl`, or no fetch implementation is available.    |              |
| `OkvnsNetworkError`            | `network`             | The request failed before a response was received.           | `cause`      |
| `OkvnsValidationError`         | `validation`          | The API rejected the request (HTTP 400).                     |              |
| `OkvnsServerError`             | `server`              | The API failed (HTTP 5xx).                                   | `status`     |
| `OkvnsInvalidResponseError`    | `invalid-response`    | A successful response had no string `value`.                 |              |
| `OkvnsUnexpectedResponseError` | `unexpected-response` | Any other response, including a 404 that is not a not-found. | `status`     |
