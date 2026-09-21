-- Adds nullable descriptions. Idempotent: each ALTER runs only when the column is missing.
SET @add_namespace_description = (
  SELECT IF(COUNT(*) = 0,
    'ALTER TABLE namespaces ADD COLUMN description VARCHAR(1000) NULL AFTER name',
    'SELECT 1')
  FROM information_schema.COLUMNS
  WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'namespaces' AND COLUMN_NAME = 'description'
);
PREPARE stmt FROM @add_namespace_description;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

SET @add_entry_description = (
  SELECT IF(COUNT(*) = 0,
    'ALTER TABLE entries ADD COLUMN description VARCHAR(1000) NULL AFTER `value`',
    'SELECT 1')
  FROM information_schema.COLUMNS
  WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'entries' AND COLUMN_NAME = 'description'
);
PREPARE stmt FROM @add_entry_description;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;
