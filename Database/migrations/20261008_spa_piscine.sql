CREATE TABLE IF NOT EXISTS spa_tarifs (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  nom VARCHAR(150) NOT NULL,
  categorie VARCHAR(30) NOT NULL,
  prix DECIMAL(12,2) NOT NULL DEFAULT 0,
  nb_entrees INT UNSIGNED DEFAULT NULL,
  duree_jours INT UNSIGNED DEFAULT NULL,
  actif TINYINT(1) NOT NULL DEFAULT 1,
  ordre INT NOT NULL DEFAULT 0,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  KEY idx_spa_tarifs_actif (actif),
  KEY idx_spa_tarifs_categorie (categorie)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS spa_sessions (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  date_session DATE NOT NULL,
  statut VARCHAR(20) NOT NULL DEFAULT 'OUVERTE',
  ouvert_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  ouvert_par BIGINT UNSIGNED DEFAULT NULL,
  cloture_at DATETIME DEFAULT NULL,
  cloture_par BIGINT UNSIGNED DEFAULT NULL,
  PRIMARY KEY (id),
  KEY idx_spa_sessions_statut (statut)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS spa_ventes (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  session_id BIGINT UNSIGNED NOT NULL,
  date_vente DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  montant DECIMAL(12,2) NOT NULL DEFAULT 0,
  moyen_paiement VARCHAR(30) NOT NULL DEFAULT 'ESPECES',
  client_nom VARCHAR(150) DEFAULT NULL,
  client_telephone VARCHAR(40) DEFAULT NULL,
  hotel_reservation_id BIGINT UNSIGNED DEFAULT NULL,
  chambre VARCHAR(60) DEFAULT NULL,
  lignes JSON DEFAULT NULL,
  statut VARCHAR(20) NOT NULL DEFAULT 'OUVERTE',
  cloture_id BIGINT UNSIGNED DEFAULT NULL,
  user_id BIGINT UNSIGNED DEFAULT NULL,
  PRIMARY KEY (id),
  KEY idx_spa_ventes_session (session_id),
  KEY idx_spa_ventes_cloture (cloture_id),
  KEY idx_spa_ventes_room (hotel_reservation_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS spa_abonnements (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  numero VARCHAR(40) NOT NULL,
  vente_id BIGINT UNSIGNED NOT NULL,
  tarif_id BIGINT UNSIGNED NOT NULL,
  formule VARCHAR(150) NOT NULL,
  client_nom VARCHAR(150) NOT NULL,
  client_telephone VARCHAR(40) DEFAULT NULL,
  date_debut DATE NOT NULL,
  date_fin DATE DEFAULT NULL,
  entrees_total INT UNSIGNED DEFAULT NULL,
  entrees_restantes INT UNSIGNED DEFAULT NULL,
  annule TINYINT(1) NOT NULL DEFAULT 0,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  UNIQUE KEY uk_spa_abonnements_numero (numero),
  KEY idx_spa_abonnements_vente (vente_id),
  KEY idx_spa_abonnements_tarif (tarif_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS spa_passages (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  abonnement_id BIGINT UNSIGNED NOT NULL,
  date_passage DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  user_id BIGINT UNSIGNED DEFAULT NULL,
  PRIMARY KEY (id),
  KEY idx_spa_passages_abonnement (abonnement_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS spa_clotures (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  reference VARCHAR(80) NOT NULL,
  session_id BIGINT UNSIGNED NOT NULL,
  date_session DATE NOT NULL,
  date_cloture DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  total_montant DECIMAL(12,2) NOT NULL DEFAULT 0,
  nombre_ventes INT UNSIGNED NOT NULL DEFAULT 0,
  nombre_entrees INT UNSIGNED NOT NULL DEFAULT 0,
  details JSON DEFAULT NULL,
  created_by BIGINT UNSIGNED DEFAULT NULL,
  PRIMARY KEY (id),
  UNIQUE KEY uk_spa_clotures_reference (reference),
  KEY idx_spa_clotures_session (session_id),
  KEY idx_spa_clotures_date (date_cloture)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
