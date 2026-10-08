-- Consentement signé du joueur pour recevoir ses fiches Casino par WhatsApp.
-- node Database/runMigration.js Database/migrations/20261007_casino_player_whatsapp_fiche_consent.sql
SET @consent_exists = (SELECT COUNT(*) FROM information_schema.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'casino_players' AND COLUMN_NAME = 'whatsapp_fiche_consent');
SET @consent_sql = IF(@consent_exists = 0, 'ALTER TABLE casino_players ADD COLUMN whatsapp_fiche_consent TINYINT(1) NOT NULL DEFAULT 0 AFTER whatsapp', 'SELECT 1');
PREPARE consent_statement FROM @consent_sql;
EXECUTE consent_statement;
DEALLOCATE PREPARE consent_statement;

SET @consent_signature_exists = (SELECT COUNT(*) FROM information_schema.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'casino_players' AND COLUMN_NAME = 'whatsapp_fiche_consent_signature');
SET @consent_signature_sql = IF(@consent_signature_exists = 0, 'ALTER TABLE casino_players ADD COLUMN whatsapp_fiche_consent_signature MEDIUMTEXT NULL AFTER whatsapp_fiche_consent', 'SELECT 1');
PREPARE consent_signature_statement FROM @consent_signature_sql;
EXECUTE consent_signature_statement;
DEALLOCATE PREPARE consent_signature_statement;

SET @consent_at_exists = (SELECT COUNT(*) FROM information_schema.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'casino_players' AND COLUMN_NAME = 'whatsapp_fiche_consent_at');
SET @consent_at_sql = IF(@consent_at_exists = 0, 'ALTER TABLE casino_players ADD COLUMN whatsapp_fiche_consent_at DATETIME NULL AFTER whatsapp_fiche_consent_signature', 'SELECT 1');
PREPARE consent_at_statement FROM @consent_at_sql;
EXECUTE consent_at_statement;
DEALLOCATE PREPARE consent_at_statement;
