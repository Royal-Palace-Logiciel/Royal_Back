-- Rapport journalier Hotel : situation des chambres durant la nuitee.
-- Une ligne par date de rapport. Le detail par chambre est stocke en JSON
-- (numero, occupant, DA, DD, MT, P, CN, E, AC...) pour rester fidele au modele
-- manuscrit rempli par la reception, ou chaque chambre peut porter des mentions
-- libres ("Booking", "Chambre gratuit", "paye par TPE BFV recu par Angello"...).

CREATE TABLE IF NOT EXISTS hotel_daily_reports (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
  report_date DATE NOT NULL,
  heure_debut VARCHAR(10) NULL COMMENT 'Debut de la nuitee, ex. 17h08',
  heure_fin VARCHAR(10) NULL COMMENT 'Fin de la nuitee, ex. 5h51',
  receptionniste VARCHAR(190) NULL,
  rooms LONGTEXT NULL COMMENT 'JSON : une entree par chambre',
  observations LONGTEXT NULL,
  metrics LONGTEXT NULL COMMENT 'JSON : totaux calcules au moment de l enregistrement',
  created_by BIGINT UNSIGNED NULL,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME NULL ON UPDATE CURRENT_TIMESTAMP,
  UNIQUE KEY uq_hotel_daily_reports_date (report_date)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Le rapport est genere automatiquement depuis les chambres et les reservations.
-- auto_state conserve ce qui ne se deduit pas des donnees : le mode (auto ou saisie
-- libre), les corrections manuelles ligne par ligne, les chambres retirees ou
-- ajoutees a la main, et les heures de nuitee forcees par la reception. Sans lui,
-- rouvrir un rapport ecraserait ces corrections a la regeneration suivante.
SET @auto_state_exists = (SELECT COUNT(*) FROM information_schema.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'hotel_daily_reports' AND COLUMN_NAME = 'auto_state');
SET @auto_state_sql = IF(@auto_state_exists = 0, 'ALTER TABLE hotel_daily_reports ADD COLUMN auto_state LONGTEXT NULL', 'SELECT 1');
PREPARE auto_state_statement FROM @auto_state_sql;
EXECUTE auto_state_statement;
DEALLOCATE PREPARE auto_state_statement;
