CREATE TABLE IF NOT EXISTS paf_sessions (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  date_session DATE NOT NULL,
  statut ENUM('OUVERTE', 'CLOTUREE') NOT NULL DEFAULT 'OUVERTE',
  ouvert_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  cloture_at DATETIME DEFAULT NULL,
  ouvert_par BIGINT UNSIGNED DEFAULT NULL,
  cloture_par BIGINT UNSIGNED DEFAULT NULL,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  KEY idx_paf_sessions_statut (statut),
  KEY idx_paf_sessions_date (date_session),
  CONSTRAINT fk_paf_sessions_ouvert_par FOREIGN KEY (ouvert_par) REFERENCES users (id_admin) ON DELETE SET NULL,
  CONSTRAINT fk_paf_sessions_cloture_par FOREIGN KEY (cloture_par) REFERENCES users (id_admin) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS paf_clotures (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  reference VARCHAR(64) NOT NULL,
  session_id BIGINT UNSIGNED NOT NULL,
  date_session DATE NOT NULL,
  date_cloture DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  total_montant DECIMAL(12,2) NOT NULL DEFAULT 0.00,
  nombre_operations INT UNSIGNED NOT NULL DEFAULT 0,
  total_homme INT UNSIGNED NOT NULL DEFAULT 0,
  total_femme INT UNSIGNED NOT NULL DEFAULT 0,
  details JSON NOT NULL,
  created_by BIGINT UNSIGNED DEFAULT NULL,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  UNIQUE KEY uq_paf_clotures_reference (reference),
  KEY idx_paf_clotures_date (date_session, date_cloture),
  CONSTRAINT fk_paf_clotures_session FOREIGN KEY (session_id) REFERENCES paf_sessions (id) ON DELETE RESTRICT,
  CONSTRAINT fk_paf_clotures_created_by FOREIGN KEY (created_by) REFERENCES users (id_admin) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS paf_operations (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  session_id BIGINT UNSIGNED NOT NULL,
  cloture_id BIGINT UNSIGNED DEFAULT NULL,
  date_operation DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  montant DECIMAL(12,2) NOT NULL DEFAULT 0.00,
  type_operation VARCHAR(30) NOT NULL DEFAULT 'ENTREE',
  description VARCHAR(255) DEFAULT NULL,
  statut ENUM('OUVERTE', 'CLOTUREE') NOT NULL DEFAULT 'OUVERTE',
  moyen_paiement VARCHAR(30) NOT NULL DEFAULT 'ESPECES',
  details JSON NOT NULL,
  user_id BIGINT UNSIGNED DEFAULT NULL,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  KEY idx_paf_operations_session_status (session_id, statut, cloture_id),
  KEY idx_paf_operations_cloture (cloture_id),
  KEY idx_paf_operations_date (date_operation),
  CONSTRAINT fk_paf_operations_session FOREIGN KEY (session_id) REFERENCES paf_sessions (id) ON DELETE RESTRICT,
  CONSTRAINT fk_paf_operations_cloture FOREIGN KEY (cloture_id) REFERENCES paf_clotures (id) ON DELETE RESTRICT,
  CONSTRAINT fk_paf_operations_user FOREIGN KEY (user_id) REFERENCES users (id_admin) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
