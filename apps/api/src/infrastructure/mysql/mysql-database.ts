import { Injectable, Logger, type OnApplicationShutdown } from '@nestjs/common';
import mysql, { type Pool } from 'mysql2/promise';
import type { MysqlConfig } from '../../config';

/**
 * Owns the shared MySQL connection pool and closes it on application shutdown.
 * The pool is the single entry point to MySQL for the repository adapter and
 * readiness indicator, keeping `mysql2` types contained to infrastructure.
 */
@Injectable()
export class MysqlDatabase implements OnApplicationShutdown {
  private readonly logger = new Logger(MysqlDatabase.name);
  readonly pool: Pool;

  constructor(config: MysqlConfig) {
    this.pool = mysql.createPool({
      host: config.host,
      port: config.port,
      database: config.database,
      user: config.user,
      password: config.password,
      connectionLimit: config.connectionLimit,
      connectTimeout: config.connectTimeoutMs,
      waitForConnections: true,
    });
  }

  async onApplicationShutdown(): Promise<void> {
    try {
      await this.pool.end();
    } catch (error) {
      this.logger.warn(`Failed to close MySQL pool cleanly: ${String(error)}`);
    }
  }
}
