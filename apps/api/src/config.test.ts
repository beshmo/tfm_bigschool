import { describe, expect, it } from 'vitest';
import { ConfigError, loadConfig } from './config';

const mysqlEnv = {
  OKVNS_MYSQL_HOST: 'db',
  OKVNS_MYSQL_DATABASE: 'okvns',
  OKVNS_MYSQL_USER: 'okvns',
};

describe('loadConfig', () => {
  it('GIVEN the memory driver WHEN loaded THEN defaults apply and no MySQL settings are needed', () => {
    expect(loadConfig({ OKVNS_STORAGE_DRIVER: 'memory' })).toEqual({
      port: 3000,
      corsOrigin: '*',
      storageDriver: 'memory',
    });
  });

  it('GIVEN MySQL is the default driver WHEN required settings are present THEN they are read with defaults', () => {
    expect(loadConfig(mysqlEnv)).toEqual({
      port: 3000,
      corsOrigin: '*',
      storageDriver: 'mysql',
      mysql: {
        host: 'db',
        port: 3306,
        database: 'okvns',
        user: 'okvns',
        password: '',
        poolLimit: 10,
        connectTimeoutMs: 10_000,
      },
    });
  });

  it('GIVEN every variable WHEN loaded THEN each overrides its default', () => {
    const config = loadConfig({
      ...mysqlEnv,
      OKVNS_API_PORT: '8080',
      OKVNS_CORS_ORIGIN: 'https://admin.example.com',
      OKVNS_STORAGE_DRIVER: 'mysql',
      OKVNS_MYSQL_PORT: '3307',
      OKVNS_MYSQL_PASSWORD: 'secret',
      OKVNS_MYSQL_POOL_LIMIT: '4',
      OKVNS_MYSQL_CONNECT_TIMEOUT_MS: '2500',
    });

    expect(config).toMatchObject({ port: 8080, corsOrigin: 'https://admin.example.com' });
    expect(config.mysql).toMatchObject({
      port: 3307,
      password: 'secret',
      poolLimit: 4,
      connectTimeoutMs: 2500,
    });
  });

  it('GIVEN blank optional variables WHEN loaded THEN defaults apply', () => {
    expect(loadConfig({ ...mysqlEnv, OKVNS_API_PORT: '', OKVNS_CORS_ORIGIN: '' })).toMatchObject({
      port: 3000,
      corsOrigin: '*',
    });
  });

  it.each([
    [{}, 'OKVNS_MYSQL_HOST, OKVNS_MYSQL_DATABASE, OKVNS_MYSQL_USER'],
    [{ OKVNS_MYSQL_HOST: 'db' }, 'OKVNS_MYSQL_DATABASE, OKVNS_MYSQL_USER'],
    [{ ...mysqlEnv, OKVNS_MYSQL_USER: '' }, 'OKVNS_MYSQL_USER'],
  ])('GIVEN missing MySQL settings %j WHEN loaded THEN startup fails naming them', (env, names) => {
    expect(() => loadConfig(env)).toThrow(ConfigError);
    expect(() => loadConfig(env)).toThrow(names);
  });

  it('GIVEN an unknown driver WHEN loaded THEN it is rejected', () => {
    expect(() => loadConfig({ OKVNS_STORAGE_DRIVER: 'redis' })).toThrow(
      'OKVNS_STORAGE_DRIVER must be "mysql" or "memory".',
    );
  });

  it.each([
    ['OKVNS_API_PORT', 'abc'],
    ['OKVNS_API_PORT', '70000'],
    ['OKVNS_API_PORT', '-1'],
    ['OKVNS_API_PORT', '3.5'],
    ['OKVNS_MYSQL_PORT', '0'],
    ['OKVNS_MYSQL_POOL_LIMIT', '0'],
    ['OKVNS_MYSQL_CONNECT_TIMEOUT_MS', 'soon'],
  ])('GIVEN %s=%s WHEN loaded THEN it is rejected', (name, value) => {
    expect(() => loadConfig({ ...mysqlEnv, [name]: value })).toThrow(name);
  });

  it('GIVEN no argument WHEN loaded THEN process.env is used', () => {
    const before = process.env.OKVNS_STORAGE_DRIVER;
    process.env.OKVNS_STORAGE_DRIVER = 'memory';
    try {
      expect(loadConfig().storageDriver).toBe('memory');
    } finally {
      if (before === undefined) delete process.env.OKVNS_STORAGE_DRIVER;
      else process.env.OKVNS_STORAGE_DRIVER = before;
    }
  });

  it('GIVEN a ConfigError WHEN inspected THEN it has a name', () => {
    expect(new ConfigError('x').name).toBe('ConfigError');
  });
});
