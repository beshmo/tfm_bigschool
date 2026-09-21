import { Module, type OnModuleDestroy } from '@nestjs/common';
import type { NamespaceRepository } from '@okvns/application';
import { APP_CONFIG, NAMESPACE_REPOSITORY, READINESS_INDICATOR } from '../tokens';
import { loadConfig, type AppConfig } from '../config';
import { InMemoryNamespaceRepository } from './in-memory-namespace-repository';
import { MysqlDatabase } from './mysql/mysql-database';
import { MysqlNamespaceRepository } from './mysql/mysql-namespace-repository';
import {
  MysqlReadinessIndicator,
  alwaysReady,
  type ReadinessIndicator,
} from './mysql/mysql-readiness';

/** The storage adapter chosen by `OKVNS_STORAGE_DRIVER`, plus its lifecycle. */
export class Persistence implements OnModuleDestroy {
  constructor(
    readonly repository: NamespaceRepository,
    readonly readiness: ReadinessIndicator,
    private readonly database?: MysqlDatabase,
  ) {}

  async onModuleDestroy(): Promise<void> {
    await this.database?.onModuleDestroy();
  }
}

export function createPersistence(config: AppConfig): Persistence {
  if (config.storageDriver === 'memory' || !config.mysql) {
    return new Persistence(new InMemoryNamespaceRepository(), alwaysReady);
  }
  const database = new MysqlDatabase(config.mysql);
  return new Persistence(
    new MysqlNamespaceRepository(database.pool),
    new MysqlReadinessIndicator(database.pool),
    database,
  );
}

@Module({
  providers: [
    { provide: APP_CONFIG, useFactory: () => loadConfig() },
    { provide: Persistence, useFactory: createPersistence, inject: [APP_CONFIG] },
    {
      provide: NAMESPACE_REPOSITORY,
      useFactory: (persistence: Persistence) => persistence.repository,
      inject: [Persistence],
    },
    {
      provide: READINESS_INDICATOR,
      useFactory: (persistence: Persistence) => persistence.readiness,
      inject: [Persistence],
    },
  ],
  exports: [APP_CONFIG, NAMESPACE_REPOSITORY, READINESS_INDICATOR],
})
export class PersistenceModule {}
