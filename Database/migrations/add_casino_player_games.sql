-- Registre durable des joueurs Casino et participations par journée/table.
SET @date_inscription_exists = (
  SELECT COUNT(*) FROM information_schema.COLUMNS
  WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'casino_players' AND COLUMN_NAME = 'date_inscription'
);
SET @date_inscription_sql = IF(@date_inscription_exists = 0,
  'ALTER TABLE casino_players ADD COLUMN date_inscription DATE NULL AFTER email',
  'SELECT 1'
);
PREPARE date_inscription_statement FROM @date_inscription_sql;
EXECUTE date_inscription_statement;
DEALLOCATE PREPARE date_inscription_statement;

UPDATE casino_players SET date_inscription = DATE(created_at) WHERE date_inscription IS NULL;

CREATE TABLE IF NOT EXISTS casino_player_games (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  casino_player_id BIGINT UNSIGNED NOT NULL,
  game_date DATE NOT NULL,
  table_name VARCHAR(150) NOT NULL,
  player_sheet_id BIGINT UNSIGNED NULL,
  depot DECIMAL(15,2) NOT NULL DEFAULT 0,
  credit DECIMAL(15,2) NOT NULL DEFAULT 0,
  statut ENUM('EN_JEU', 'TERMINE', 'ANNULE') NOT NULL DEFAULT 'EN_JEU',
  created_by BIGINT UNSIGNED NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  UNIQUE KEY uq_casino_player_game_day_table (casino_player_id, game_date, table_name),
  INDEX idx_casino_player_games_date (game_date, table_name),
  CONSTRAINT fk_casino_player_games_player FOREIGN KEY (casino_player_id) REFERENCES casino_players(id) ON DELETE CASCADE,
  CONSTRAINT fk_casino_player_games_sheet FOREIGN KEY (player_sheet_id) REFERENCES casino_player_sheets(id) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
