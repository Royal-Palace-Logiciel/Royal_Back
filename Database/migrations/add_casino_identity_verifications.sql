CREATE TABLE IF NOT EXISTS casino_identity_verifications (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  player_sheet_id BIGINT UNSIGNED NULL,
  fiche_id INT NOT NULL,
  full_name VARCHAR(150) NOT NULL,
  id_type VARCHAR(50) NOT NULL,
  id_number VARCHAR(150) NOT NULL,
  issue_date DATE NOT NULL,
  transaction_type ENUM('ACHAT','APPORT','ECHANGE') NOT NULL,
  amount DECIMAL(15,2) NOT NULL,
  verified_at DATETIME NOT NULL,
  verified_by BIGINT UNSIGNED NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  INDEX idx_casino_identity_verification_player (player_sheet_id),
  INDEX idx_casino_identity_verification_date (created_at),
  CONSTRAINT fk_casino_identity_verification_sheet FOREIGN KEY (player_sheet_id) REFERENCES casino_player_sheets(id) ON DELETE SET NULL,
  CONSTRAINT fk_casino_identity_verification_user FOREIGN KEY (verified_by) REFERENCES users(id_admin) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
