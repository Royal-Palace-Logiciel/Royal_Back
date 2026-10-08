-- Identite obligatoire du registre durable des joueurs Casino.
SET @identity_type_exists = (SELECT COUNT(*) FROM information_schema.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'casino_players' AND COLUMN_NAME = 'identite_type');
SET @identity_type_sql = IF(@identity_type_exists = 0, 'ALTER TABLE casino_players ADD COLUMN identite_type VARCHAR(80) NULL AFTER whatsapp', 'SELECT 1');
PREPARE identity_type_statement FROM @identity_type_sql;
EXECUTE identity_type_statement;
DEALLOCATE PREPARE identity_type_statement;

SET @identity_number_exists = (SELECT COUNT(*) FROM information_schema.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'casino_players' AND COLUMN_NAME = 'identite_numero');
SET @identity_number_sql = IF(@identity_number_exists = 0, 'ALTER TABLE casino_players ADD COLUMN identite_numero VARCHAR(120) NULL AFTER identite_type', 'SELECT 1');
PREPARE identity_number_statement FROM @identity_number_sql;
EXECUTE identity_number_statement;
DEALLOCATE PREPARE identity_number_statement;

SET @identity_name_exists = (SELECT COUNT(*) FROM information_schema.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'casino_players' AND COLUMN_NAME = 'identite_nom_complet');
SET @identity_name_sql = IF(@identity_name_exists = 0, 'ALTER TABLE casino_players ADD COLUMN identite_nom_complet VARCHAR(255) NULL AFTER identite_numero', 'SELECT 1');
PREPARE identity_name_statement FROM @identity_name_sql;
EXECUTE identity_name_statement;
DEALLOCATE PREPARE identity_name_statement;

SET @identity_date_exists = (SELECT COUNT(*) FROM information_schema.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'casino_players' AND COLUMN_NAME = 'identite_date_emission');
SET @identity_date_sql = IF(@identity_date_exists = 0, 'ALTER TABLE casino_players ADD COLUMN identite_date_emission DATE NULL AFTER identite_nom_complet', 'SELECT 1');
PREPARE identity_date_statement FROM @identity_date_sql;
EXECUTE identity_date_statement;
DEALLOCATE PREPARE identity_date_statement;

SET @identity_verified_exists = (SELECT COUNT(*) FROM information_schema.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'casino_players' AND COLUMN_NAME = 'identite_verifiee');
SET @identity_verified_sql = IF(@identity_verified_exists = 0, 'ALTER TABLE casino_players ADD COLUMN identite_verifiee TINYINT(1) NOT NULL DEFAULT 0 AFTER identite_date_emission', 'SELECT 1');
PREPARE identity_verified_statement FROM @identity_verified_sql;
EXECUTE identity_verified_statement;
DEALLOCATE PREPARE identity_verified_statement;