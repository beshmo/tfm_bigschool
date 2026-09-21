import type { Pool } from 'mysql2/promise';

export interface ReadinessIndicator {
  /** Resolves `true` only when the backing store can serve traffic. */
  check(): Promise<boolean>;
}

export const alwaysReady: ReadinessIndicator = { check: async () => true };

/** Ready only when MySQL is reachable and the migrated schema (including later columns) exists. */
export class MysqlReadinessIndicator implements ReadinessIndicator {
  constructor(private readonly pool: Pool) {}

  async check(): Promise<boolean> {
    try {
      await this.pool.query('SELECT id, name, description FROM namespaces LIMIT 1');
      await this.pool.query(
        'SELECT id, namespace_id, entry_name, description, env_dependent FROM entries LIMIT 1',
      );
      return true;
    } catch {
      return false;
    }
  }
}
