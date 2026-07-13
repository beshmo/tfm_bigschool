import { Logger } from '@nestjs/common';
import type { Pool, RowDataPacket } from 'mysql2/promise';
import type { ReadinessIndicator } from '../../health/readiness';

const REQUIRED_TABLES = ['namespaces', 'entries'];

/**
 * Readiness indicator for the MySQL runtime. Reports ready only when MySQL is
 * reachable and the required OKVNS tables exist, so a probe fails while the
 * database is unavailable or unmigrated.
 */
export class MysqlReadinessIndicator implements ReadinessIndicator {
  private readonly logger = new Logger(MysqlReadinessIndicator.name);

  constructor(private readonly pool: Pool) {}

  async isReady(): Promise<boolean> {
    try {
      const connection = await this.pool.getConnection();
      try {
        await connection.query('SELECT 1');
        const [rows] = await connection.query<RowDataPacket[]>(
          `SELECT table_name FROM information_schema.tables
             WHERE table_schema = DATABASE() AND table_name IN (?)`,
          [REQUIRED_TABLES],
        );
        return rows.length >= REQUIRED_TABLES.length;
      } finally {
        connection.release();
      }
    } catch (error) {
      this.logger.warn(`MySQL readiness check failed: ${String(error)}`);
      return false;
    }
  }
}
