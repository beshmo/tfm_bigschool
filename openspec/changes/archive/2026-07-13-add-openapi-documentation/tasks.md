## 1. Swagger Setup

- [x] 1.1 Add `@nestjs/swagger` to the API package dependencies.
- [x] 1.2 Create an API-local OpenAPI setup module using `DocumentBuilder`, `SwaggerModule.createDocument`, and `SwaggerModule.setup`.
- [x] 1.3 Call the OpenAPI setup from API bootstrap without changing existing global pipes, filters, CORS, body limits, routes, or storage behavior.

## 2. API Schemas And Decorators

- [x] 2.1 Add API-local response schema classes for entries, namespaces, YAML import/export responses, health/readiness responses, and safe error bodies.
- [x] 2.2 Add Swagger property metadata to request DTOs while preserving existing class-validator behavior.
- [x] 2.3 Annotate namespace controller operations with tags, summaries, path parameters, request bodies, success responses, and error responses.
- [x] 2.4 Annotate entry controller operations with tags, summaries, path parameters, request bodies, success responses, and error responses.
- [x] 2.5 Annotate YAML controller operations with tags, summaries, JSON import body metadata, multipart file upload metadata, export response schemas, and error responses.
- [x] 2.6 Annotate health and readiness controller operations with tags, success responses, and readiness failure response metadata.

## 3. Verification

- [x] 3.1 Extend API contract tests to assert the raw OpenAPI document endpoint returns a valid document.
- [x] 3.2 Assert the generated OpenAPI document includes health, readiness, namespace, entry, YAML import, and YAML export paths.
- [x] 3.3 Assert representative request, response, multipart upload, and safe error schemas are present in the generated OpenAPI document.
- [x] 3.4 Run API tests and relevant repo verification commands.

## 4. Documentation

- [x] 4.1 Update developer documentation with the Swagger UI endpoint and raw OpenAPI document endpoint.
- [x] 4.2 Keep the existing Markdown API/YAML reference as the semantic reference for YAML rules, errors, and migration notes.
