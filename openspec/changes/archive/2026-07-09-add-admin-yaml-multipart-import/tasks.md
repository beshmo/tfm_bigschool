## 1. Frontend API Mapping

- [x] 1.1 Add `importYamlFile(file: File): Promise<NamespaceDto[]>` to the admin frontend `OkvnsApi` port.
- [x] 1.2 Implement `HttpOkvnsApi.importYamlFile` by posting `FormData` to `/yaml/import` with the selected file appended as field `file`.
- [x] 1.3 Preserve the existing `importYaml(yaml: string)` JSON request path unchanged.

## 2. Admin Import UI

- [x] 2.1 Add a distinct YAML file input and upload import action to the admin import page.
- [x] 2.2 Keep pasted YAML submission separate from uploaded file submission.
- [x] 2.3 Reuse the existing success display and safe error banner behavior for both import paths.

## 3. Tests

- [x] 3.1 Add API client tests proving JSON import still sends `{ "yaml": "..." }` and file import sends multipart `FormData`.
- [x] 3.2 Update the frontend fake API and React Testing Library import page tests to cover uploaded YAML file import success and error behavior.
- [x] 3.3 Extend Playwright YAML import coverage to import namespaces through the uploaded file workflow.

## 4. Verification

- [x] 4.1 Run the admin frontend test suite.
- [x] 4.2 Run the relevant Playwright YAML import workflow.
- [x] 4.3 Run `openspec validate add-admin-yaml-multipart-import`.
