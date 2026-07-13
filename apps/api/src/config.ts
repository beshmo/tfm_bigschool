import { REQUEST_BODY_MAX_BYTES } from '@okvns/shared';

/** Selects the repository backend. MySQL is the default durable runtime. */
export type StorageDriver = 'mysql' | 'memory';

/** MySQL connection and pool configuration. */
export interface MysqlConfig {
  host: string;
  port: number;
  database: string;
  user: string;
  password: string;
  /** Maximum pooled connections. */
  connectionLimit: number;
  /** Connection acquisition/handshake timeout in milliseconds. */
  connectTimeoutMs: number;
}

export interface AppConfig {
  port: number;
  bodyLimitBytes: number;
  corsOrigin: string;
  storageDriver: StorageDriver;
  /** Present only when `storageDriver` is `mysql`. */
  mysql?: MysqlConfig;
}

/** Raised when required runtime configuration is missing or invalid. */
export class ConfigError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'ConfigError';
  }
}

function parseIntOrDefault(raw: string | undefined, fallback: number): number {
  const parsed = Number.parseInt(raw ?? '', 10);
  return Number.isNaN(parsed) ? fallback : parsed;
}

/**
 * Reads and validates MySQL configuration from the environment. Missing
 * required credentials throw a `ConfigError` so startup fails clearly instead
 * of surfacing an obscure connection error later.
 */
function loadMysqlConfig(env: NodeJS.ProcessEnv): MysqlConfig {
  const host = env.OKVNS_MYSQL_HOST?.trim();
  const database = env.OKVNS_MYSQL_DATABASE?.trim();
  const user = env.OKVNS_MYSQL_USER?.trim();
  const password = env.OKVNS_MYSQL_PASSWORD ?? '';

  const missing: string[] = [];
  if (!host) missing.push('OKVNS_MYSQL_HOST');
  if (!database) missing.push('OKVNS_MYSQL_DATABASE');
  if (!user) missing.push('OKVNS_MYSQL_USER');
  if (missing.length > 0) {
    throw new ConfigError(
      `Missing required MySQL configuration: ${missing.join(', ')}. ` +
        'Set these environment variables or use OKVNS_STORAGE_DRIVER=memory for a non-durable local profile.',
    );
  }

  const port = parseIntOrDefault(env.OKVNS_MYSQL_PORT, 3306);
  if (port <= 0 || port > 65_535) {
    throw new ConfigError(`Invalid OKVNS_MYSQL_PORT: ${env.OKVNS_MYSQL_PORT}`);
  }

  return {
    host: host as string,
    port,
    database: database as string,
    user: user as string,
    password,
    connectionLimit: parseIntOrDefault(env.OKVNS_MYSQL_POOL_LIMIT, 10),
    connectTimeoutMs: parseIntOrDefault(env.OKVNS_MYSQL_CONNECT_TIMEOUT_MS, 10_000),
  };
}

/** Reads runtime configuration from environment variables with documented defaults. */
export function loadConfig(env: NodeJS.ProcessEnv = process.env): AppConfig {
  const port = parseIntOrDefault(env.OKVNS_API_PORT, 3000);
  const storageDriver: StorageDriver =
    env.OKVNS_STORAGE_DRIVER?.trim() === 'memory' ? 'memory' : 'mysql';

  return {
    port,
    bodyLimitBytes: REQUEST_BODY_MAX_BYTES,
    corsOrigin: env.OKVNS_CORS_ORIGIN ?? '*',
    storageDriver,
    mysql: storageDriver === 'mysql' ? loadMysqlConfig(env) : undefined,
  };
}
