import type { OnModuleDestroy } from '@nestjs/common';
import { createPool, type Pool } from 'mysql2/promise';
import type { MysqlConfig } from '../../config';

/** Owns the MySQL connection pool and closes it on application shutdown. */
export class MysqlDatabase implements OnModuleDestroy {
  readonly pool: Pool;

  constructor(config: MysqlConfig) {
    this.pool = createPool({
      host: config.host,
      port: config.port,
      database: config.database,
      user: config.user,
      password: config.password,
      connectionLimit: config.poolLimit,
      connectTimeout: config.connectTimeoutMs,
      charset: 'utf8mb4',
      // TIMESTAMP columns are read and written in UTC regardless of the server zone.
      timezone: 'Z',
    });
    this.pool.pool.on('connection', (connection) => {
      connection.query("SET time_zone = '+00:00'");
    });
  }

  async onModuleDestroy(): Promise<void> {
    await this.pool.end();
  }
}
