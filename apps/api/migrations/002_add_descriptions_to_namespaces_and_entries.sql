-- Adds optional human-facing descriptions to namespaces and entries.
--
-- Columns are nullable so existing rows upgrade in place with no description.
-- MySQL 8 has no `ADD COLUMN IF NOT EXISTS`, so each ALTER is guarded against
-- information_schema to keep re-running this file safe (matching 001).

SET @add_namespace_description = IF(
  EXISTS(
    SELECT 1 FROM information_schema.COLUMNS
    WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'namespaces' AND COLUMN_NAME = 'description'
  ),
  'SELECT 1',
  'ALTER TABLE namespaces ADD COLUMN description VARCHAR(1000) NULL AFTER name'
);
PREPARE stmt FROM @add_namespace_description;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

SET @add_entry_description = IF(
  EXISTS(
    SELECT 1 FROM information_schema.COLUMNS
    WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'entries' AND COLUMN_NAME = 'description'
  ),
  'SELECT 1',
  'ALTER TABLE entries ADD COLUMN description VARCHAR(1000) NULL AFTER value'
);
PREPARE stmt FROM @add_entry_description;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;
