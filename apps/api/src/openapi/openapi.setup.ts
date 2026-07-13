import type { INestApplication } from '@nestjs/common';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import { ApiErrorResponse } from '../common/api-error.schema';
import { EntryResponse } from '../entries/entry.schema';
import { HealthResponse, ReadinessResponse } from '../health/health.schema';
import { NamespaceResponse } from '../namespaces/namespace.schema';
import { YamlImportDto, YamlImportFileDto } from '../yaml/yaml.dto';
import { YamlExportResponse, YamlImportResponse } from '../yaml/yaml.schema';

/** Path where Swagger UI is served (raw OpenAPI JSON at `${OPENAPI_PATH}-json`). */
export const OPENAPI_PATH = 'docs';

/**
 * Builds the OpenAPI document from NestJS controller metadata and mounts both
 * the interactive Swagger UI and the raw OpenAPI JSON document. Called from
 * bootstrap after {@link applyGlobals}, so it does not change the app's global
 * pipes, filters, CORS, body limits, routes, or storage behavior.
 */
export function setupOpenApi(app: INestApplication): void {
  const config = new DocumentBuilder()
    .setTitle('OKVNS API')
    .setDescription(
      'Organizes UTF-8 key-value entries inside named namespaces, with YAML ' +
        'import/export. See docs/api-and-yaml.md for YAML semantics and error codes.',
    )
    .setVersion('0.1.0')
    .addTag('health', 'Liveness and readiness probes')
    .addTag('namespaces', 'Namespace management')
    .addTag('entries', 'Key-value entries within a namespace')
    .addTag('yaml', 'YAML import and export')
    .build();

  const document = SwaggerModule.createDocument(app, config, {
    extraModels: [
      ApiErrorResponse,
      EntryResponse,
      NamespaceResponse,
      YamlImportResponse,
      YamlExportResponse,
      HealthResponse,
      ReadinessResponse,
      YamlImportDto,
      YamlImportFileDto,
    ],
  });

  SwaggerModule.setup(OPENAPI_PATH, app, document, {
    swaggerOptions: { persistAuthorization: true },
  });
}
