import { Test } from '@nestjs/testing';
import type { INestApplication } from '@nestjs/common';
import { AppModule } from '../src/app.module';
import { applyGlobals } from '../src/app-globals';
import { loadConfig } from '../src/config';

/** Builds a fully-configured Nest application for contract tests. */
export async function createTestApp(): Promise<INestApplication> {
  const moduleRef = await Test.createTestingModule({ imports: [AppModule] }).compile();
  const app = moduleRef.createNestApplication();
  applyGlobals(app, loadConfig({}));
  await app.init();
  return app;
}
