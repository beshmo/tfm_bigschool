## Why

The API is currently documented only in Markdown, which is useful for humans but does not provide a machine-readable contract for client generation, interactive exploration, or automated documentation checks. Adding generated OpenAPI/Swagger documentation keeps the API contract closer to the NestJS controllers and makes the existing OKVNS endpoints easier to inspect and integrate.

## What Changes

- Add generated OpenAPI documentation for the OKVNS API.
- Expose Swagger UI and the raw OpenAPI JSON document from the API process.
- Annotate API controllers, request DTOs, response DTOs, path parameters, multipart upload support, and safe error responses so generated documentation reflects implemented behavior.
- Keep existing API routes, request shapes, response shapes, and status codes unchanged.
- Update project documentation to point developers to the generated API documentation endpoint.

## Capabilities

### New Capabilities
- `api-documentation`: Generated OpenAPI/Swagger documentation for API discovery, endpoint schemas, request formats, response schemas, and safe error shapes.

### Modified Capabilities
- None.

## Impact

- Affected code: `apps/api` bootstrap, controllers, DTOs, and API tests.
- Affected documentation: `docs/api-and-yaml.md`, `README.md`, or engineering docs that describe API usage.
- New dependency: `@nestjs/swagger` for OpenAPI document generation and Swagger UI integration.
- API compatibility: no breaking route, payload, or persistence behavior changes.
