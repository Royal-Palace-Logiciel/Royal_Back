-- Preserve the exceptional-cleaning details sent by the Hotel housekeeping form.
SET @dbname = DATABASE();
SET @column_exists = (
  SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS
  WHERE TABLE_SCHEMA = @dbname
    AND TABLE_NAME = 'housekeeping_tasks'
    AND COLUMN_NAME = 'exceptional_details'
);
SET @sql = IF(
  @column_exists = 0,
  'ALTER TABLE housekeeping_tasks ADD COLUMN exceptional_details TEXT NULL',
  'SELECT ''Column housekeeping_tasks.exceptional_details already exists'' AS info'
);
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;
