## Context

`POST /yaml/import` already supports two request formats: JSON with a `yaml` field and multipart upload with a single `file` field. The React admin frontend currently imports YAML only by sending pasted textarea content through the JSON path. The admin import page and API client should expose both backend-supported formats without blending them into one behavior.

The frontend architecture keeps transport details isolated in `apps/admin-web/src/api`, with React components depending on the `OkvnsApi` port instead of calling `fetch` directly.

## Goals / Non-Goals

**Goals:**

- Add a distinct admin YAML file upload flow that submits the selected `File` as multipart field `file`.
- Preserve pasted YAML import through the existing JSON `{ "yaml": "..." }` request path.
- Keep request and response mapping inside the frontend API client.
- Preserve existing success display and safe error handling behavior.
- Add focused frontend and E2E coverage for the multipart import path.

**Non-Goals:**

- Do not change the backend YAML import endpoint or response shape.
- Do not read selected files into the textarea and submit them as JSON.
- Do not add persistence, authentication, or new YAML schema behavior.
- Do not change YAML export behavior.

## Decisions

### Add a separate API client method for file import

Add an `importYamlFile(file: File): Promise<NamespaceDto[]>` method to the `OkvnsApi` port and `HttpOkvnsApi` implementation.

Rationale: The API client is the boundary that owns transport mapping. A separate method keeps the JSON and multipart contracts explicit and avoids overloading `importYaml` with mixed argument types.

Alternative considered: change `importYaml` to accept `string | File`. This would make call sites less clear and push type checks into the API client method.

### Submit selected files directly as multipart form data

When the user submits the file upload form, construct a `FormData`, append the selected file as field `file`, and post it to `/yaml/import` without manually setting `Content-Type`.

Rationale: The browser must set the multipart boundary. Submitting the actual `File` exercises the backend multipart contract and avoids duplicating file decoding in the browser.

Alternative considered: read the file with `FileReader`, populate the textarea, and submit JSON. That may be useful for a preview/edit feature later, but it does not verify the backend multipart path.

### Keep paste and upload as separate UI actions

The import page should keep pasted YAML and file upload as distinct controls and submission actions.

Rationale: Separate actions match the separate backend contracts, reduce ambiguity when both textarea content and a file are present, and keep validation errors tied to the path the user submitted.

Alternative considered: one import button that chooses file over textarea when a file is selected. That is compact, but it hides which contract is being exercised and can surprise users who typed content but still have a stale file selected.

## Risks / Trade-offs

- Selected file errors may not preserve editable content -> Keep pasted textarea content independent and leave selected file state visible so the user can retry or choose another file.
- Tests may assert too much about native `FormData` internals -> Verify endpoint, method, and that the body is `FormData`; keep detailed field assertions to environments that support reading form entries reliably.
- Adding a second import action can clutter the page -> Use concise labels and maintain one clear success/error result area shared by both import paths.
