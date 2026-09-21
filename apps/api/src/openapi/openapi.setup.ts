import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import type { INestApplication } from '@nestjs/common';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';

/** The API version is the package version, so it never drifts from `package.json`. */
function packageVersion(): string {
  const manifest = JSON.parse(readFileSync(join(__dirname, '..', '..', 'package.json'), 'utf8'));
  return manifest.version as string;
}

/** Serves Swagger UI at `/docs` and the raw OpenAPI document at `/docs-json`. */
export function setupOpenApi(app: INestApplication): void {
  const config = new DocumentBuilder()
    .setTitle('OKVNS API')
    .setDescription(
      'Organizes UTF-8 key-value entries inside named namespaces, with YAML ' +
        'import/export. See docs/api-and-yaml.md for YAML semantics and error codes.',
    )
    .setVersion(packageVersion())
    .addTag('health', 'Liveness and readiness probes')
    .addTag('namespaces', 'Namespace management')
    .addTag('entries', 'Key-value entries within a namespace')
    .addTag('yaml', 'YAML import and export')
    .build();
  SwaggerModule.setup('docs', app, SwaggerModule.createDocument(app, config), {
    jsonDocumentUrl: 'docs-json',
  });
}
