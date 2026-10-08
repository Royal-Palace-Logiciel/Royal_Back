-- Coordonnees et surnom du registre durable des joueurs Casino.
SET @whatsapp_exists = (
  SELECT COUNT(*) FROM information_schema.COLUMNS
  WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'casino_players' AND COLUMN_NAME = 'whatsapp'
);
SET @whatsapp_sql = IF(@whatsapp_exists = 0,
  'ALTER TABLE casino_players ADD COLUMN whatsapp VARCHAR(50) NULL AFTER telephone',
  'SELECT 1'
);
PREPARE whatsapp_statement FROM @whatsapp_sql;
EXECUTE whatsapp_statement;
DEALLOCATE PREPARE whatsapp_statement;

SET @surnom_exists = (
  SELECT COUNT(*) FROM information_schema.COLUMNS
  WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'casino_players' AND COLUMN_NAME = 'surnom'
);
SET @surnom_sql = IF(@surnom_exists = 0,
  'ALTER TABLE casino_players ADD COLUMN surnom VARCHAR(150) NULL AFTER prenom',
  'SELECT 1'
);
PREPARE surnom_statement FROM @surnom_sql;
EXECUTE surnom_statement;
DEALLOCATE PREPARE surnom_statement;