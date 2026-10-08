SET @pdj_inclus_exists = (
  SELECT COUNT(*) FROM information_schema.COLUMNS
  WHERE TABLE_SCHEMA = DATABASE()
    AND TABLE_NAME = 'reservations'
    AND COLUMN_NAME = 'pdj_inclus'
);
SET @pdj_inclus_sql = IF(@pdj_inclus_exists = 0,
  'ALTER TABLE reservations ADD COLUMN pdj_inclus TINYINT(1) NOT NULL DEFAULT 0 AFTER date_depart',
  'SELECT 1'
);
PREPARE pdj_inclus_statement FROM @pdj_inclus_sql;
EXECUTE pdj_inclus_statement;
DEALLOCATE PREPARE pdj_inclus_statement;