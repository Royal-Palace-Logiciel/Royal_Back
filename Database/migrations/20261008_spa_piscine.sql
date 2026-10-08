-- Module SPA — Piscine (remplace le module Casino).
-- Tarifs (entrées, locations, abonnements), caisse avec sessions et clôtures
-- comme le PAF, ventes, abonnements et passages.
-- Ces tables sont aussi créées au démarrage par models/spaModel.js (ensureSpaSchema).

CREATE TABLE IF NOT EXISTS spa_tarifs (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  nom VARCHAR(120) NOT NULL,
  categorie ENUM('ENTREE', 'LOCATION', 'ABONNEMENT') NOT NULL DEFAULT 'ENTREE',
  prix DECIMAL(12,2) NOT NULL DEFAULT 0.00,
  nb_entrees INT UNSIGNED DEFAULT NULL,
  duree_jours INT UNSIGNED DEFAULT NULL,
  actif TINYINT(1) NOT NULL DEFAULT 1,
  ordre INT NOT NULL DEFAULT 0,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  KEY idx_spa_tarifs_categorie (categorie, actif)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS spa_sessions (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  date_session DATE NOT NULL,
  statut ENUM('OUVERTE', 'CLOTUREE') NOT NULL DEFAULT 'OUVERTE',
  active_marker TINYINT GENERATED ALWAYS AS (IF(statut = 'OUVERTE', 1, NULL)) STORED,
  ouvert_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  cloture_at DATETIME DEFAULT NULL,
  ouvert_par BIGINT UNSIGNED DEFAULT NULL,
  cloture_par BIGINT UNSIGNED DEFAULT NULL,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  UNIQUE KEY uq_spa_sessions_active_marker (active_marker),
  CONSTRAINT fk_spa_sessions_ouvert_par FOREIGN KEY (ouvert_par) REFERENCES users (id_admin) ON DELETE SET NULL,
  CONSTRAINT fk_spa_sessions_cloture_par FOREIGN KEY (cloture_par) REFERENCES users (id_admin) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS spa_clotures (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  reference VARCHAR(64) NOT NULL,
  session_id BIGINT UNSIGNED NOT NULL,
  date_session DATE NOT NULL,
  date_cloture DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  total_montant DECIMAL(12,2) NOT NULL DEFAULT 0.00,
  nombre_ventes INT UNSIGNED NOT NULL DEFAULT 0,
  nombre_entrees INT UNSIGNED NOT NULL DEFAULT 0,
  details JSON NOT NULL,
  created_by BIGINT UNSIGNED DEFAULT NULL,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  UNIQUE KEY uq_spa_clotures_reference (reference),
  KEY idx_spa_clotures_date (date_session, date_cloture),
  CONSTRAINT fk_spa_clotures_session FOREIGN KEY (session_id) REFERENCES spa_sessions (id) ON DELETE RESTRICT,
  CONSTRAINT fk_spa_clotures_created_by FOREIGN KEY (created_by) REFERENCES users (id_admin) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS spa_ventes (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  session_id BIGINT UNSIGNED NOT NULL,
  cloture_id BIGINT UNSIGNED DEFAULT NULL,
  date_vente DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  montant DECIMAL(12,2) NOT NULL DEFAULT 0.00,
  moyen_paiement VARCHAR(30) NOT NULL DEFAULT 'ESPECES',
  client_nom VARCHAR(150) DEFAULT NULL,
  client_telephone VARCHAR(40) DEFAULT NULL,
  hotel_reservation_id BIGINT UNSIGNED DEFAULT NULL,
  chambre VARCHAR(60) DEFAULT NULL,
  lignes JSON NOT NULL,
  statut ENUM('OUVERTE', 'CLOTUREE') NOT NULL DEFAULT 'OUVERTE',
  user_id BIGINT UNSIGNED DEFAULT NULL,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  KEY idx_spa_ventes_session (session_id, statut, cloture_id),
  KEY idx_spa_ventes_cloture (cloture_id),
  KEY idx_spa_ventes_reservation (hotel_reservation_id),
  KEY idx_spa_ventes_date (date_vente),
  CONSTRAINT fk_spa_ventes_session FOREIGN KEY (session_id) REFERENCES spa_sessions (id) ON DELETE RESTRICT,
  CONSTRAINT fk_spa_ventes_cloture FOREIGN KEY (cloture_id) REFERENCES spa_clotures (id) ON DELETE RESTRICT,
  CONSTRAINT fk_spa_ventes_user FOREIGN KEY (user_id) REFERENCES users (id_admin) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS spa_abonnements (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  numero VARCHAR(40) NOT NULL,
  vente_id BIGINT UNSIGNED DEFAULT NULL,
  tarif_id BIGINT UNSIGNED DEFAULT NULL,
  formule VARCHAR(120) NOT NULL,
  client_nom VARCHAR(150) NOT NULL,
  client_telephone VARCHAR(40) DEFAULT NULL,
  date_debut DATE NOT NULL,
  date_fin DATE DEFAULT NULL,
  entrees_total INT UNSIGNED DEFAULT NULL,
  entrees_restantes INT UNSIGNED DEFAULT NULL,
  annule TINYINT(1) NOT NULL DEFAULT 0,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  UNIQUE KEY uq_spa_abonnements_numero (numero),
  KEY idx_spa_abonnements_client (client_nom),
  CONSTRAINT fk_spa_abonnements_vente FOREIGN KEY (vente_id) REFERENCES spa_ventes (id) ON DELETE SET NULL,
  CONSTRAINT fk_spa_abonnements_tarif FOREIGN KEY (tarif_id) REFERENCES spa_tarifs (id) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS spa_passages (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  abonnement_id BIGINT UNSIGNED NOT NULL,
  date_passage DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  user_id BIGINT UNSIGNED DEFAULT NULL,
  PRIMARY KEY (id),
  KEY idx_spa_passages_abonnement (abonnement_id, date_passage),
  CONSTRAINT fk_spa_passages_abonnement FOREIGN KEY (abonnement_id) REFERENCES spa_abonnements (id) ON DELETE CASCADE,
  CONSTRAINT fk_spa_passages_user FOREIGN KEY (user_id) REFERENCES users (id_admin) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
