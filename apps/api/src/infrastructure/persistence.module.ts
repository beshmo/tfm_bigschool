import { Module, type Provider } from '@nestjs/common';
import { loadConfig, type AppConfig } from '../config';
import {
  AlwaysReadyIndicator,
  READINESS_INDICATOR,
  type ReadinessIndicator,
} from '../health/readiness';
import { InMemoryNamespaceRepository } from './in-memory-namespace-repository';
import { MysqlDatabase } from './mysql/mysql-database';
import { MysqlNamespaceRepository } from './mysql/mysql-namespace-repository';
import { MysqlReadinessIndicator } from './mysql/mysql-readiness';
import { APP_CONFIG, NAMESPACE_REPOSITORY } from './tokens';

/**
 * Wires the namespace repository and readiness indicator for the configured
 * storage driver. Configuration is read at provider-instantiation time (not at
 * module load) so the process environment fully determines the backend. MySQL
 * is the durable default; the `memory` driver keeps a non-durable in-memory
 * adapter for fast local demos and tests.
 *
 * `MysqlDatabase` owns the connection pool and is `null` under the `memory`
 * driver, so no pool is opened when MySQL is not in use.
 */
const configProvider: Provider = {
  provide: APP_CONFIG,
  useFactory: (): AppConfig => loadConfig(),
};

const databaseProvider: Provider = {
  provide: MysqlDatabase,
  useFactory: (config: AppConfig): MysqlDatabase | null =>
    config.storageDriver === 'mysql' && config.mysql ? new MysqlDatabase(config.mysql) : null,
  inject: [APP_CONFIG],
};

const repositoryProvider: Provider = {
  provide: NAMESPACE_REPOSITORY,
  useFactory: (config: AppConfig, database: MysqlDatabase | null) => {
    if (config.storageDriver === 'memory' || !database) {
      return new InMemoryNamespaceRepository();
    }
    return new MysqlNamespaceRepository(database.pool);
  },
  inject: [APP_CONFIG, MysqlDatabase],
};

const readinessProvider: Provider = {
  provide: READINESS_INDICATOR,
  useFactory: (config: AppConfig, database: MysqlDatabase | null): ReadinessIndicator => {
    if (config.storageDriver === 'memory' || !database) {
      return new AlwaysReadyIndicator();
    }
    return new MysqlReadinessIndicator(database.pool);
  },
  inject: [APP_CONFIG, MysqlDatabase],
};

@Module({
  providers: [configProvider, databaseProvider, repositoryProvider, readinessProvider],
  exports: [NAMESPACE_REPOSITORY, READINESS_INDICATOR],
})
export class PersistenceModule {}
