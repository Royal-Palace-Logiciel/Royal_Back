-- Le transport whatsapp-web.js permet d envoyer dans un GROUPE, ce que l API
-- officielle ne fait pas. Un groupe n est pas un numero : son identifiant est
-- un jid complet (120363000000000000@g.us), que la normalisation "chiffres
-- seulement" detruirait. D ou une colonne type, et un champ elargi.
-- A executer APRES 20260930_hotel_report_whatsapp.sql.

SET @type_exists = (SELECT COUNT(*) FROM information_schema.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'hotel_report_whatsapp_recipients' AND COLUMN_NAME = 'type');
SET @type_sql = IF(@type_exists = 0, 'ALTER TABLE hotel_report_whatsapp_recipients ADD COLUMN type VARCHAR(10) NOT NULL DEFAULT ''NUMERO''', 'SELECT 1');
PREPARE type_statement FROM @type_sql;
EXECUTE type_statement;
DEALLOCATE PREPARE type_statement;

ALTER TABLE hotel_report_whatsapp_recipients MODIFY COLUMN numero VARCHAR(64) NOT NULL
