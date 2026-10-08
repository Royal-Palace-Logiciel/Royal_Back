-- Add user tracking fields to reservations table for history and audit purposes.
SET @reservation_created_by_exists = (SELECT COUNT(*) FROM information_schema.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'reservations' AND COLUMN_NAME = 'created_by');
SET @reservation_created_by_sql = IF(@reservation_created_by_exists = 0, 'ALTER TABLE reservations ADD COLUMN created_by BIGINT UNSIGNED NULL', 'SELECT 1');
PREPARE reservation_created_by_statement FROM @reservation_created_by_sql;
EXECUTE reservation_created_by_statement;
DEALLOCATE PREPARE reservation_created_by_statement;

SET @reservation_modified_by_exists = (SELECT COUNT(*) FROM information_schema.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'reservations' AND COLUMN_NAME = 'modified_by');
SET @reservation_modified_by_sql = IF(@reservation_modified_by_exists = 0, 'ALTER TABLE reservations ADD COLUMN modified_by BIGINT UNSIGNED NULL', 'SELECT 1');
PREPARE reservation_modified_by_statement FROM @reservation_modified_by_sql;
EXECUTE reservation_modified_by_statement;
DEALLOCATE PREPARE reservation_modified_by_statement;

SET @reservation_created_at_exists = (SELECT COUNT(*) FROM information_schema.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'reservations' AND COLUMN_NAME = 'created_at');
SET @reservation_created_at_sql = IF(@reservation_created_at_exists = 0, 'ALTER TABLE reservations ADD COLUMN created_at DATETIME NULL DEFAULT CURRENT_TIMESTAMP', 'SELECT 1');
PREPARE reservation_created_at_statement FROM @reservation_created_at_sql;
EXECUTE reservation_created_at_statement;
DEALLOCATE PREPARE reservation_created_at_statement;

SET @reservation_updated_at_exists = (SELECT COUNT(*) FROM information_schema.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'reservations' AND COLUMN_NAME = 'updated_at');
SET @reservation_updated_at_sql = IF(@reservation_updated_at_exists = 0, 'ALTER TABLE reservations ADD COLUMN updated_at DATETIME NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP', 'SELECT 1');
PREPARE reservation_updated_at_statement FROM @reservation_updated_at_sql;
EXECUTE reservation_updated_at_statement;
DEALLOCATE PREPARE reservation_updated_at_statement;

-- Add foreign key constraints if they don't exist
SET @fk_created_by_exists = (SELECT COUNT(*) FROM information_schema.TABLE_CONSTRAINTS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'reservations' AND CONSTRAINT_NAME = 'fk_reservations_created_by');
SET @fk_created_by_sql = IF(@fk_created_by_exists = 0, 'ALTER TABLE reservations ADD CONSTRAINT fk_reservations_created_by FOREIGN KEY (created_by) REFERENCES users(id_admin) ON DELETE SET NULL', 'SELECT 1');
PREPARE fk_created_by_statement FROM @fk_created_by_sql;
EXECUTE fk_created_by_statement;
DEALLOCATE PREPARE fk_created_by_statement;

SET @fk_modified_by_exists = (SELECT COUNT(*) FROM information_schema.TABLE_CONSTRAINTS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'reservations' AND CONSTRAINT_NAME = 'fk_reservations_modified_by');
SET @fk_modified_by_sql = IF(@fk_modified_by_exists = 0, 'ALTER TABLE reservations ADD CONSTRAINT fk_reservations_modified_by FOREIGN KEY (modified_by) REFERENCES users(id_admin) ON DELETE SET NULL', 'SELECT 1');
PREPARE fk_modified_by_statement FROM @fk_modified_by_sql;
EXECUTE fk_modified_by_statement;
DEALLOCATE PREPARE fk_modified_by_statement;

-- Add indexes for better query performance on history filtering
SET @idx_created_by_exists = (SELECT COUNT(*) FROM information_schema.STATISTICS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'reservations' AND INDEX_NAME = 'idx_reservations_created_by');
SET @idx_created_by_sql = IF(@idx_created_by_exists = 0, 'CREATE INDEX idx_reservations_created_by ON reservations(created_by)', 'SELECT 1');
PREPARE idx_created_by_statement FROM @idx_created_by_sql;
EXECUTE idx_created_by_statement;
DEALLOCATE PREPARE idx_created_by_statement;

SET @idx_modified_by_exists = (SELECT COUNT(*) FROM information_schema.STATISTICS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'reservations' AND INDEX_NAME = 'idx_reservations_modified_by');
SET @idx_modified_by_sql = IF(@idx_modified_by_exists = 0, 'CREATE INDEX idx_reservations_modified_by ON reservations(modified_by)', 'SELECT 1');
PREPARE idx_modified_by_statement FROM @idx_modified_by_sql;
EXECUTE idx_modified_by_statement;
DEALLOCATE PREPARE idx_modified_by_statement;

SET @idx_created_at_exists = (SELECT COUNT(*) FROM information_schema.STATISTICS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'reservations' AND INDEX_NAME = 'idx_reservations_created_at');
SET @idx_created_at_sql = IF(@idx_created_at_exists = 0, 'CREATE INDEX idx_reservations_created_at ON reservations(created_at)', 'SELECT 1');
PREPARE idx_created_at_statement FROM @idx_created_at_sql;
EXECUTE idx_created_at_statement;
DEALLOCATE PREPARE idx_created_at_statement;
