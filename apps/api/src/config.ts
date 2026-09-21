export type StorageDriver = 'mysql' | 'memory';

export interface MysqlConfig {
  host: string;
  port: number;
  database: string;
  user: string;
  password: string;
  poolLimit: number;
  connectTimeoutMs: number;
}

export interface AppConfig {
  port: number;
  corsOrigin: string;
  storageDriver: StorageDriver;
  /** Present only for the `mysql` driver. */
  mysql?: MysqlConfig;
}

export class ConfigError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'ConfigError';
  }
}

type Env = Record<string, string | undefined>;

function integer(env: Env, name: string, fallback: number, min: number, max: number): number {
  const raw = env[name];
  if (raw === undefined || raw === '') {
    return fallback;
  }
  const value = Number(raw);
  if (!Number.isInteger(value) || value < min || value > max) {
    throw new ConfigError(`${name} must be an integer between ${min} and ${max}.`);
  }
  return value;
}

/** Reads runtime configuration from environment variables; fails fast when invalid. */
export function loadConfig(env: Env = process.env): AppConfig {
  const driver = env.OKVNS_STORAGE_DRIVER || 'mysql';
  if (driver !== 'mysql' && driver !== 'memory') {
    throw new ConfigError('OKVNS_STORAGE_DRIVER must be "mysql" or "memory".');
  }
  const config: AppConfig = {
    port: integer(env, 'OKVNS_API_PORT', 3000, 0, 65535),
    corsOrigin: env.OKVNS_CORS_ORIGIN || '*',
    storageDriver: driver,
  };
  if (driver === 'memory') {
    return config;
  }

  const missing = ['OKVNS_MYSQL_HOST', 'OKVNS_MYSQL_DATABASE', 'OKVNS_MYSQL_USER'].filter(
    (name) => !env[name],
  );
  if (missing.length > 0) {
    throw new ConfigError(
      `Missing required MySQL configuration: ${missing.join(', ')}. ` +
        'Set them, or use OKVNS_STORAGE_DRIVER=memory for a non-durable demo.',
    );
  }
  config.mysql = {
    host: env.OKVNS_MYSQL_HOST as string,
    port: integer(env, 'OKVNS_MYSQL_PORT', 3306, 1, 65535),
    database: env.OKVNS_MYSQL_DATABASE as string,
    user: env.OKVNS_MYSQL_USER as string,
    password: env.OKVNS_MYSQL_PASSWORD ?? '',
    poolLimit: integer(env, 'OKVNS_MYSQL_POOL_LIMIT', 10, 1, 1000),
    connectTimeoutMs: integer(env, 'OKVNS_MYSQL_CONNECT_TIMEOUT_MS', 10_000, 1, 600_000),
  };
  return config;
}
