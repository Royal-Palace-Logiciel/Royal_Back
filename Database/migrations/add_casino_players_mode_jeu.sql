SET @mode_jeu_exists = (
  SELECT COUNT(*) FROM information_schema.COLUMNS
  WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'casino_players' AND COLUMN_NAME = 'mode_jeu'
);
SET @mode_jeu_sql = IF(@mode_jeu_exists = 0,
  'ALTER TABLE casino_players ADD COLUMN mode_jeu VARCHAR(100) NULL AFTER credit',
  'SELECT 1'
);
PREPARE mode_jeu_statement FROM @mode_jeu_sql;
EXECUTE mode_jeu_statement;
DEALLOCATE PREPARE mode_jeu_statement;

UPDATE casino_players SET mode_jeu = '' WHERE mode_jeu IS NULL;