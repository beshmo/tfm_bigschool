## Why

The API already accepts YAML imports as either JSON text or a multipart file upload, but the admin frontend only exercises the JSON text path. Admin users need a distinct file upload flow that submits selected YAML files through the backend multipart contract instead of reading the file into the paste form.

## What Changes

- Add a separate YAML file upload path to the admin import page.
- Submit selected YAML files to `POST /yaml/import` as `multipart/form-data` using the required field name `file`.
- Keep pasted YAML imports on the existing JSON `{ "yaml": "..." }` path.
- Preserve existing import success and validation error behavior in the UI.
- Cover the file upload API mapping and browser import workflow with frontend tests.

## Capabilities

### New Capabilities

- None.

### Modified Capabilities

- `admin-frontend`: Admin YAML import must support a separate file upload path that submits multipart field `file`.

## Impact

- Frontend API client: add multipart YAML import mapping alongside the existing JSON import mapping.
- Admin import page: add distinct file selection and upload submission UI.
- Frontend tests: cover file upload behavior and API client `FormData` request mapping.
- E2E tests: exercise the browser YAML file import workflow.
