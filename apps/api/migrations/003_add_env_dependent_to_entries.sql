-- Adds the environment-dependence marker. Existing rows read back as FALSE.
-- Idempotent: the ALTER runs only when the column is missing.
SET @add_env_dependent = (
  SELECT IF(COUNT(*) = 0,
    'ALTER TABLE entries ADD COLUMN env_dependent BOOLEAN NOT NULL DEFAULT FALSE AFTER description',
    'SELECT 1')
  FROM information_schema.COLUMNS
  WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'entries' AND COLUMN_NAME = 'env_dependent'
);
PREPARE stmt FROM @add_env_dependent;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;
