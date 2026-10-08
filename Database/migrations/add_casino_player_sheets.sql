CREATE TABLE IF NOT EXISTS casino_player_sheets (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  sheet_date DATE NOT NULL,
  table_name VARCHAR(150) NOT NULL,
  sheet_data JSON NOT NULL,
  created_by BIGINT UNSIGNED NULL,
  updated_by BIGINT UNSIGNED NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  UNIQUE KEY uq_casino_player_sheet_date_table (sheet_date, table_name),
  INDEX idx_casino_player_sheet_date (sheet_date),
  CONSTRAINT fk_casino_player_sheet_created_by FOREIGN KEY (created_by) REFERENCES users(id_admin) ON DELETE SET NULL,
  CONSTRAINT fk_casino_player_sheet_updated_by FOREIGN KEY (updated_by) REFERENCES users(id_admin) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;