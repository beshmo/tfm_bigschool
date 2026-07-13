## Context

OKVNS exposes a NestJS API with namespaces, entries, YAML import/export, health, and readiness endpoints. These endpoints are documented in `docs/api-and-yaml.md` and covered by API contract tests, but the API does not currently expose a machine-readable OpenAPI document or interactive Swagger UI.

The implementation should follow the NestJS Swagger integration pattern: build an OpenAPI document during bootstrap, scan controller metadata, and serve both Swagger UI and raw JSON from the API process. Because shared DTOs in `@okvns/shared` are TypeScript interfaces, they are not available at runtime for OpenAPI schema generation; API-facing schema classes are needed where generated documentation must describe response bodies.

## Goals / Non-Goals

**Goals:**
- Expose generated OpenAPI documentation for all current API endpoints.
- Keep the generated schemas aligned with request DTO validation rules, response shapes, path parameters, multipart upload support, and safe error bodies.
- Keep existing API behavior, routes, status codes, and payloads unchanged.
- Add tests that detect accidental removal of the OpenAPI endpoints or documented operations.
- Update developer documentation with the generated docs location.

**Non-Goals:**
- No authentication or authorization documentation, because the MVP API has no auth.
- No client SDK generation in this change.
- No replacement of the existing Markdown API reference; it remains useful for YAML semantics and migration notes.
- No route versioning or global API prefix changes.

## Decisions

### Generate documentation from NestJS metadata

Use `@nestjs/swagger` with `DocumentBuilder`, `SwaggerModule.createDocument`, and `SwaggerModule.setup` during API bootstrap.

Alternatives considered:
- Handwritten OpenAPI YAML or JSON: precise, but easy to drift from controllers and validation metadata.
- Markdown-only documentation: already exists, but does not support machine-readable contracts or interactive exploration.

Rationale: generated docs keep endpoint discovery close to the code while preserving the current manual reference for deeper semantics.

### Keep Swagger setup isolated

Add a small API-local OpenAPI setup module and call it from `main.ts` after global app configuration is applied.

Alternatives considered:
- Inline all Swagger setup in `main.ts`: workable, but makes bootstrap harder to scan as runtime configuration grows.

Rationale: a dedicated setup function keeps bootstrap readable and gives tests a stable place to exercise OpenAPI behavior.

### Use explicit API schema classes for generated responses

Create API-local DTO/schema classes for generated response documentation such as entries, namespaces, YAML export/import responses, health/readiness responses, and safe error bodies. Request DTOs should receive `@ApiProperty` metadata alongside existing class-validator decorators.

Alternatives considered:
- Reuse only `@okvns/shared` interfaces: not viable for runtime OpenAPI schema generation because interfaces are erased by TypeScript.
- Move shared interfaces to decorated classes in `@okvns/shared`: expands framework coupling risk because shared packages should stay framework-independent.

Rationale: API-local schema classes preserve clean architecture boundaries and avoid NestJS/Swagger decorators leaking into framework-independent packages.

### Document both YAML import request formats

Document `POST /yaml/import` as supporting JSON body input and multipart `file` upload input, with a successful response shape shared by both paths.

Alternatives considered:
- Document only JSON input: incomplete because the implemented API supports multipart upload.

Rationale: clients need to discover both supported import modes from the generated API documentation.

## Risks / Trade-offs

- Generated documentation can still drift from prose docs if semantics are updated in only one place -> Mitigate by updating `docs/api-and-yaml.md` to link to generated docs and keeping contract tests focused on generated endpoint coverage.
- OpenAPI decorators add controller noise -> Mitigate by keeping schema classes and reusable error response helpers local to `apps/api`.
- Swagger UI exposes API shape in deployed environments -> Mitigate by documenting the route clearly; if future auth or environment gating is needed, handle it in a separate change.
- Multipart OpenAPI metadata is more verbose than JSON metadata -> Mitigate with a focused helper or explicit controller annotations for the YAML import route.

## Migration Plan

1. Add `@nestjs/swagger` to the API package.
2. Add OpenAPI setup during API bootstrap.
3. Add API-local schema classes and decorators to controllers/DTOs.
4. Extend API contract tests to assert the raw OpenAPI document includes expected paths and schemas.
5. Update docs with the Swagger UI and JSON document locations.

Rollback is simple: remove the Swagger setup call and dependency. Existing API routes and storage behavior are not changed by this feature.

## Open Questions

- Should Swagger UI be enabled in every runtime environment or controlled by an environment variable later?
- Should the OpenAPI JSON route be treated as a published artifact in CI in a future change?
