import type { NestExpressApplication } from '@nestjs/platform-express';
import { Test } from '@nestjs/testing';
import type { NamespaceRepository } from '@okvns/application';
import { AppModule } from '../src/app.module';
import { applyGlobals } from '../src/app-globals';
import type { ReadinessIndicator } from '../src/infrastructure/mysql/mysql-readiness';
import { NAMESPACE_REPOSITORY, READINESS_INDICATOR } from '../src/tokens';

export interface TestAppOptions {
  /** Replaces the storage adapter (for example to inject a clock or a failure). */
  repository?: NamespaceRepository;
  readiness?: ReadinessIndicator;
}

/** Boots the real module graph with the same globals as `main.ts`. */
export async function createTestApp(options: TestAppOptions = {}): Promise<NestExpressApplication> {
  let builder = Test.createTestingModule({ imports: [AppModule] });
  if (options.repository) {
    builder = builder.overrideProvider(NAMESPACE_REPOSITORY).useValue(options.repository);
  }
  if (options.readiness) {
    builder = builder.overrideProvider(READINESS_INDICATOR).useValue(options.readiness);
  }
  const app = (await builder.compile()).createNestApplication<NestExpressApplication>();
  applyGlobals(app);
  await app.init();
  return app;
}

/** A clock that advances one second per call, starting at 2026-01-01T00:00:00Z. */
export function steppingClock(): () => Date {
  let tick = 0;
  return () => new Date(Date.UTC(2026, 0, 1, 0, 0, tick++));
}
