-- Adds the environment-dependence marker to entries.
--
-- The column is NOT NULL with a default of FALSE: the flag is a binary marker,
-- so existing rows upgrade in place to `false` through the default rather than
-- carrying a NULL "unknown" state. Only metadata is added — no entry value is
-- read or rewritten.
--
-- MySQL 8 has no `ADD COLUMN IF NOT EXISTS`, so the ALTER is guarded against
-- information_schema to keep re-running this file safe (matching 001 and 002).

SET @add_entry_env_dependent = IF(
  EXISTS(
    SELECT 1 FROM information_schema.COLUMNS
    WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'entries' AND COLUMN_NAME = 'env_dependent'
  ),
  'SELECT 1',
  'ALTER TABLE entries ADD COLUMN env_dependent BOOLEAN NOT NULL DEFAULT FALSE AFTER description'
);
PREPARE stmt FROM @add_entry_env_dependent;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;
