-- Document original de la piece d'identite du joueur Casino.
SET @identity_file_exists = (SELECT COUNT(*) FROM information_schema.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'casino_players' AND COLUMN_NAME = 'identite_fichier_url');
SET @identity_file_sql = IF(@identity_file_exists = 0, 'ALTER TABLE casino_players ADD COLUMN identite_fichier_url VARCHAR(500) NULL AFTER identite_verifiee', 'SELECT 1');
PREPARE identity_file_statement FROM @identity_file_sql;
EXECUTE identity_file_statement;
DEALLOCATE PREPARE identity_file_statement;

SET @identity_files_exists = (SELECT COUNT(*) FROM information_schema.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'casino_players' AND COLUMN_NAME = 'identite_fichiers_urls');
SET @identity_files_sql = IF(@identity_files_exists = 0, 'ALTER TABLE casino_players ADD COLUMN identite_fichiers_urls TEXT NULL AFTER identite_fichier_url', 'SELECT 1');
PREPARE identity_files_statement FROM @identity_files_sql;
EXECUTE identity_files_statement;
DEALLOCATE PREPARE identity_files_statement;