import 'reflect-metadata';
import { Logger } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { applyGlobals } from './app-globals';
import { loadConfig } from './config';
import { setupOpenApi } from './openapi/openapi.setup';

async function bootstrap(): Promise<void> {
  const config = loadConfig();
  const app = await NestFactory.create(AppModule, { bodyParser: false });
  app.enableShutdownHooks();
  applyGlobals(app, config);
  setupOpenApi(app);
  await app.listen(config.port);
  new Logger('Bootstrap').log(`OKVNS API listening on port ${config.port}`);
}

bootstrap().catch((error) => {
  new Logger('Bootstrap').error(error instanceof Error ? error.message : String(error));
  process.exit(1);
});
