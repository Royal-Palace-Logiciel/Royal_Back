SET @statut_jeu_exists = (
  SELECT COUNT(*) FROM information_schema.COLUMNS
  WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'casino_players' AND COLUMN_NAME = 'statut_jeu'
);
SET @statut_jeu_sql = IF(@statut_jeu_exists = 0,
  'ALTER TABLE casino_players ADD COLUMN statut_jeu ENUM(''EN_JEU'', ''ARRETE'') NOT NULL DEFAULT ''ARRETE'' AFTER mode_jeu',
  'SELECT 1'
);
PREPARE statut_jeu_statement FROM @statut_jeu_sql;
EXECUTE statut_jeu_statement;
DEALLOCATE PREPARE statut_jeu_statement;