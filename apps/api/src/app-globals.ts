import type { NestExpressApplication } from '@nestjs/platform-express';
import { REQUEST_BODY_MAX_BYTES } from '@okvns/shared';
import { DomainExceptionFilter } from './common/domain-exception.filter';
import { createValidationPipe } from './common/validation';
import type { AppConfig } from './config';
import { setupOpenApi } from './openapi/openapi.setup';

/**
 * Applies everything that must behave identically in `main.ts` and in tests:
 * body limits, CORS, the safe error filter, request validation and OpenAPI.
 */
export function applyGlobals(
  app: NestExpressApplication,
  config?: Pick<AppConfig, 'corsOrigin'>,
): void {
  app.useBodyParser('json', { limit: REQUEST_BODY_MAX_BYTES });
  app.enableCors({ origin: config?.corsOrigin ?? '*' });
  app.useGlobalFilters(new DomainExceptionFilter());
  app.useGlobalPipes(createValidationPipe());
  setupOpenApi(app);
}
