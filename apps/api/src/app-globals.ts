import { ValidationPipe, type INestApplication } from '@nestjs/common';
import { json } from 'express';
import { DomainExceptionFilter } from './common/domain-exception.filter';
import type { AppConfig } from './config';

/**
 * Applies the shared runtime configuration (body limits, validation, CORS, and
 * the global exception filter) so production and tests behave identically.
 */
export function applyGlobals(app: INestApplication, config: AppConfig): void {
  app.use(json({ limit: config.bodyLimitBytes }));
  app.enableCors({ origin: config.corsOrigin });
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
    }),
  );
  app.useGlobalFilters(new DomainExceptionFilter());
}
