import { REQUEST_BODY_MAX_BYTES } from '@okvns/shared';

export interface AppConfig {
  port: number;
  bodyLimitBytes: number;
  corsOrigin: string;
}

/** Reads runtime configuration from environment variables with documented defaults. */
export function loadConfig(env: NodeJS.ProcessEnv = process.env): AppConfig {
  const parsedPort = Number.parseInt(env.OKVNS_API_PORT ?? '', 10);
  return {
    port: Number.isNaN(parsedPort) ? 3000 : parsedPort,
    bodyLimitBytes: REQUEST_BODY_MAX_BYTES,
    corsOrigin: env.OKVNS_CORS_ORIGIN ?? '*',
  };
}
