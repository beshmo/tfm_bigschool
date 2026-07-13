import { Test } from '@nestjs/testing';
import type { INestApplication } from '@nestjs/common';
import { AppModule } from '../src/app.module';
import { applyGlobals } from '../src/app-globals';
import { loadConfig } from '../src/config';
import { setupOpenApi } from '../src/openapi/openapi.setup';

/** Builds a fully-configured Nest application for contract tests. */
export async function createTestApp(): Promise<INestApplication> {
  const moduleRef = await Test.createTestingModule({ imports: [AppModule] }).compile();
  const app = moduleRef.createNestApplication();
  // Read from the process environment so global config (and the wired storage
  // driver) match; the test setup defaults OKVNS_STORAGE_DRIVER to `memory`.
  applyGlobals(app, loadConfig());
  setupOpenApi(app);
  app.enableShutdownHooks();
  await app.init();
  return app;
}
