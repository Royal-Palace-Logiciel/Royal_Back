-- Hotel data structure for company, tour operator and occupants.
-- Safe to run more than once. Existing clients, reservations and rooms are preserved.

SET NAMES utf8mb4;

SET @room_types_prix_base_exists := (
  SELECT COUNT(*)
  FROM information_schema.COLUMNS
  WHERE TABLE_SCHEMA = DATABASE()
    AND TABLE_NAME = 'room_types'
    AND COLUMN_NAME = 'prix_base'
);
SET @room_types_prix_base_sql := IF(
  @room_types_prix_base_exists = 0,
  'ALTER TABLE room_types ADD COLUMN prix_base BIGINT UNSIGNED DEFAULT NULL',
  'SELECT 1'
);
PREPARE room_types_prix_base_stmt FROM @room_types_prix_base_sql;
EXECUTE room_types_prix_base_stmt;
DEALLOCATE PREPARE room_types_prix_base_stmt;

CREATE TABLE IF NOT EXISTS hotel_settings (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  setting_key VARCHAR(100) NOT NULL,
  setting_value TEXT NOT NULL,
  PRIMARY KEY (id),
  UNIQUE KEY uq_hotel_settings_key (setting_key)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

INSERT INTO hotel_settings (setting_key, setting_value) VALUES
  ('nom', 'Royal Palace'),
  ('adresse', 'T''sarasaotra, Route d''Ambositra, Antsirabe, 110, Madagascar'),
  ('email_reservation', 'royalpalace.resa@moov.mg'),
  ('capacite_chambres', '54 chambres, 1 suite, 8 appartements'),
  ('check_in', '14:00'),
  ('check_out', '11:00'),
  ('horaire_restaurant', '06:00-10:00 / 12:00-14:00 / 18:00-22:30'),
  ('horaire_snack', '10:00-22:30'),
  ('horaire_piscine', '08:00-20:00'),
  ('taxe_sejour_par_nuitee', '5000')
ON DUPLICATE KEY UPDATE setting_value = VALUES(setting_value);

CREATE TABLE IF NOT EXISTS hotel_services (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  nom VARCHAR(150) NOT NULL,
  description TEXT DEFAULT NULL,
  tarif BIGINT UNSIGNED DEFAULT NULL,
  unite VARCHAR(50) DEFAULT NULL,
  PRIMARY KEY (id),
  UNIQUE KEY uq_hotel_services_nom (nom)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

INSERT INTO hotel_services (nom, description, tarif, unite) VALUES
  ('Télévision', 'Disponible dans la chambre', NULL, NULL),
  ('Wi-Fi', 'Disponible dans la chambre', NULL, NULL),
  ('Téléphone', 'Disponible dans la chambre', NULL, NULL),
  ('Room service', NULL, NULL, NULL),
  ('Mini-bar', 'Selon catégorie', NULL, NULL),
  ('Climatiseur', 'Selon catégorie', NULL, NULL),
  ('Coffre individuel', 'Disponible dans la chambre', NULL, NULL),
  ('Bouilloire', 'Disponible dans la chambre', NULL, NULL),
  ('Sèche-cheveux', 'Disponible dans la chambre', NULL, NULL),
  ('Lit supplémentaire', NULL, 30000, 'par nuit'),
  ('Blanchisserie', NULL, NULL, NULL),
  ('Piscine', 'Accès gratuit pour les clients de l''hôtel', NULL, NULL),
  ('Salle de sport', 'Accès gratuit pour les clients de l''hôtel', NULL, NULL)
ON DUPLICATE KEY UPDATE
  description = VALUES(description),
  tarif = VALUES(tarif),
  unite = VALUES(unite);

INSERT INTO room_types (nom, description, prix_base)
SELECT 'Deluxe vue postérieure', 'Bâtiment 2, 1er-2e étage, chambre double ou twin, 32 m²', 170000
WHERE NOT EXISTS (SELECT 1 FROM room_types WHERE nom = 'Deluxe vue postérieure');

INSERT INTO room_types (nom, description, prix_base)
SELECT 'Deluxe vue piscine', 'Bâtiment 2, 1er-2e étage, chambre double ou twin, 28 m²', 185000
WHERE NOT EXISTS (SELECT 1 FROM room_types WHERE nom = 'Deluxe vue piscine');

INSERT INTO room_types (nom, description, prix_base)
SELECT 'Appartement 125 m²', 'Bâtiment 2, 3e étage, 3 chambres, living et kitchenette', 400000
WHERE NOT EXISTS (SELECT 1 FROM room_types WHERE nom = 'Appartement 125 m²');

INSERT INTO room_types (nom, description, prix_base)
SELECT 'Appartement 150 m²', 'Bâtiment 2, 3e étage, 3 chambres, living et kitchenette', 450000
WHERE NOT EXISTS (SELECT 1 FROM room_types WHERE nom = 'Appartement 150 m²');

INSERT INTO room_types (nom, description, prix_base)
SELECT 'Standard catégorie 1', 'Bâtiment 1, chambre double, 28 m²', 85000
WHERE NOT EXISTS (SELECT 1 FROM room_types WHERE nom = 'Standard catégorie 1');

INSERT INTO room_types (nom, description, prix_base)
SELECT 'Standard catégorie 2', 'Bâtiment 1, 1er-2e étage, chambre double ou twin, 28 m²', 140000
WHERE NOT EXISTS (SELECT 1 FROM room_types WHERE nom = 'Standard catégorie 2');

INSERT INTO room_types (nom, description, prix_base)
SELECT 'Supérieure', 'Bâtiment 1, 3e étage, chambre double ou twin, 28 m²', 155000
WHERE NOT EXISTS (SELECT 1 FROM room_types WHERE nom = 'Supérieure');

INSERT INTO room_types (nom, description, prix_base)
SELECT 'Standard', 'Bâtiment 3, 1er étage, chambre double', 95000
WHERE NOT EXISTS (SELECT 1 FROM room_types WHERE nom = 'Standard');

INSERT INTO room_types (nom, description, prix_base)
SELECT 'Suite', 'Bâtiment 3, 3e étage, 47 m²', 185000
WHERE NOT EXISTS (SELECT 1 FROM room_types WHERE nom = 'Suite');

INSERT INTO room_types (nom, description, prix_base)
SELECT 'Chambre familiale', 'Bâtiment 3, 1er étage, 1 grand lit et 1 petit lit', 145000
WHERE NOT EXISTS (SELECT 1 FROM room_types WHERE nom = 'Chambre familiale');

INSERT INTO room_types (nom, description, prix_base)
SELECT 'Appartement familial', 'Bâtiment 3, 3e étage, chambre double et chambre twin ou 2 chambres doubles, living et kitchenette, 60 m²', 275000
WHERE NOT EXISTS (SELECT 1 FROM room_types WHERE nom = 'Appartement familial');

INSERT INTO room_types (nom, description, prix_base)
SELECT 'Appartement', 'Bâtiment 3, 1er étage, 1 chambre avec 2 lits doubles, living et kitchenette', 195000
WHERE NOT EXISTS (SELECT 1 FROM room_types WHERE nom = 'Appartement');

CREATE TABLE IF NOT EXISTS hotel_room_rates (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  room_type_id BIGINT UNSIGNED NOT NULL,
  rate_category ENUM('SOCIETE', 'TOUR_OPERATEUR') NOT NULL,
  year SMALLINT UNSIGNED NOT NULL,
  amount BIGINT UNSIGNED NOT NULL,
  PRIMARY KEY (id),
  UNIQUE KEY uq_hotel_room_rates (room_type_id, rate_category, year),
  CONSTRAINT fk_hotel_room_rates_type
    FOREIGN KEY (room_type_id) REFERENCES room_types (id)
    ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

ALTER TABLE hotel_room_rates
  MODIFY COLUMN rate_category ENUM('SOCIETE', 'TOUR_OPERATEUR', 'PUBLIC') NOT NULL;

INSERT INTO hotel_room_rates (room_type_id, rate_category, year, amount)
SELECT id, 'TOUR_OPERATEUR', 2026, 155000 FROM room_types WHERE nom = 'Deluxe vue postérieure'
ON DUPLICATE KEY UPDATE amount = VALUES(amount);

INSERT INTO hotel_room_rates (room_type_id, rate_category, year, amount)
SELECT id, 'TOUR_OPERATEUR', 2026, 170000 FROM room_types WHERE nom = 'Deluxe vue piscine'
ON DUPLICATE KEY UPDATE amount = VALUES(amount);

INSERT INTO hotel_room_rates (room_type_id, rate_category, year, amount)
SELECT id, 'TOUR_OPERATEUR', 2026, 360000 FROM room_types WHERE nom = 'Appartement 125 m²'
ON DUPLICATE KEY UPDATE amount = VALUES(amount);

INSERT INTO hotel_room_rates (room_type_id, rate_category, year, amount)
SELECT id, 'TOUR_OPERATEUR', 2026, 410000 FROM room_types WHERE nom = 'Appartement 150 m²'
ON DUPLICATE KEY UPDATE amount = VALUES(amount);

INSERT INTO hotel_room_rates (room_type_id, rate_category, year, amount)
SELECT id, 'TOUR_OPERATEUR', 2026, 85000 FROM room_types WHERE nom = 'Standard catégorie 1'
ON DUPLICATE KEY UPDATE amount = VALUES(amount);

INSERT INTO hotel_room_rates (room_type_id, rate_category, year, amount)
SELECT id, 'TOUR_OPERATEUR', 2026, 130000 FROM room_types WHERE nom = 'Standard catégorie 2'
ON DUPLICATE KEY UPDATE amount = VALUES(amount);

INSERT INTO hotel_room_rates (room_type_id, rate_category, year, amount)
SELECT id, 'TOUR_OPERATEUR', 2026, 145000 FROM room_types WHERE nom = 'Supérieure'
ON DUPLICATE KEY UPDATE amount = VALUES(amount);

INSERT INTO hotel_room_rates (room_type_id, rate_category, year, amount)
SELECT id, 'TOUR_OPERATEUR', 2026, 95000 FROM room_types WHERE nom = 'Standard'
ON DUPLICATE KEY UPDATE amount = VALUES(amount);

INSERT INTO hotel_room_rates (room_type_id, rate_category, year, amount)
SELECT id, 'TOUR_OPERATEUR', 2026, 170000 FROM room_types WHERE nom = 'Suite'
ON DUPLICATE KEY UPDATE amount = VALUES(amount);

INSERT INTO hotel_room_rates (room_type_id, rate_category, year, amount)
SELECT id, 'TOUR_OPERATEUR', 2026, 145000 FROM room_types WHERE nom = 'Chambre familiale'
ON DUPLICATE KEY UPDATE amount = VALUES(amount);

INSERT INTO hotel_room_rates (room_type_id, rate_category, year, amount)
SELECT id, 'TOUR_OPERATEUR', 2026, 260000 FROM room_types WHERE nom = 'Appartement familial'
ON DUPLICATE KEY UPDATE amount = VALUES(amount);

INSERT INTO hotel_room_rates (room_type_id, rate_category, year, amount)
SELECT id, 'TOUR_OPERATEUR', 2026, 195000 FROM room_types WHERE nom = 'Appartement'
ON DUPLICATE KEY UPDATE amount = VALUES(amount);

UPDATE hotel_services
SET description = 'Frais de service : 15%'
WHERE nom = 'Room service';

INSERT INTO hotel_room_rates (room_type_id, rate_category, year, amount)
SELECT id, 'PUBLIC', 2026, 170000 FROM room_types WHERE nom = 'Deluxe vue postérieure'
ON DUPLICATE KEY UPDATE amount = VALUES(amount);

INSERT INTO hotel_room_rates (room_type_id, rate_category, year, amount)
SELECT id, 'PUBLIC', 2026, 185000 FROM room_types WHERE nom = 'Deluxe vue piscine'
ON DUPLICATE KEY UPDATE amount = VALUES(amount);

INSERT INTO hotel_room_rates (room_type_id, rate_category, year, amount)
SELECT id, 'PUBLIC', 2026, 400000 FROM room_types WHERE nom = 'Appartement 125 m²'
ON DUPLICATE KEY UPDATE amount = VALUES(amount);

INSERT INTO hotel_room_rates (room_type_id, rate_category, year, amount)
SELECT id, 'PUBLIC', 2026, 450000 FROM room_types WHERE nom = 'Appartement 150 m²'
ON DUPLICATE KEY UPDATE amount = VALUES(amount);

INSERT INTO hotel_room_rates (room_type_id, rate_category, year, amount)
SELECT id, 'PUBLIC', 2026, 85000 FROM room_types WHERE nom = 'Standard catégorie 1'
ON DUPLICATE KEY UPDATE amount = VALUES(amount);

INSERT INTO hotel_room_rates (room_type_id, rate_category, year, amount)
SELECT id, 'PUBLIC', 2026, 130000 FROM room_types WHERE nom = 'Standard catégorie 2'
ON DUPLICATE KEY UPDATE amount = VALUES(amount);

INSERT INTO hotel_room_rates (room_type_id, rate_category, year, amount)
SELECT id, 'PUBLIC', 2026, 145000 FROM room_types WHERE nom = 'Supérieure'
ON DUPLICATE KEY UPDATE amount = VALUES(amount);

INSERT INTO hotel_room_rates (room_type_id, rate_category, year, amount)
SELECT id, 'PUBLIC', 2026, 95000 FROM room_types WHERE nom = 'Standard'
ON DUPLICATE KEY UPDATE amount = VALUES(amount);

INSERT INTO hotel_room_rates (room_type_id, rate_category, year, amount)
SELECT id, 'PUBLIC', 2026, 185000 FROM room_types WHERE nom = 'Suite'
ON DUPLICATE KEY UPDATE amount = VALUES(amount);

INSERT INTO hotel_room_rates (room_type_id, rate_category, year, amount)
SELECT id, 'PUBLIC', 2026, 145000 FROM room_types WHERE nom = 'Chambre familiale'
ON DUPLICATE KEY UPDATE amount = VALUES(amount);

INSERT INTO hotel_room_rates (room_type_id, rate_category, year, amount)
SELECT id, 'PUBLIC', 2026, 275000 FROM room_types WHERE nom = 'Appartement familial'
ON DUPLICATE KEY UPDATE amount = VALUES(amount);

INSERT INTO hotel_room_rates (room_type_id, rate_category, year, amount)
SELECT id, 'PUBLIC', 2026, 195000 FROM room_types WHERE nom = 'Appartement'
ON DUPLICATE KEY UPDATE amount = VALUES(amount);

INSERT INTO hotel_room_rates (room_type_id, rate_category, year, amount)
SELECT id, 'SOCIETE', 2026, prix_base
FROM room_types
WHERE prix_base IS NOT NULL
ON DUPLICATE KEY UPDATE amount = VALUES(amount);

-- Chambres publiques 2026 des bâtiments 1 et 2.
-- L'insertion est idempotente afin de préserver les chambres déjà créées.
INSERT INTO rooms (room_type_id, numero, etage, capacite, prix_nuit)
SELECT rt.id, room_data.numero, room_data.etage, room_data.capacite, room_data.prix_nuit
FROM (
  SELECT '002' AS numero, 1 AS etage, 2 AS capacite, 85000 AS prix_nuit, 'Standard catégorie 1' AS type_nom
  UNION ALL SELECT '003', 1, 2, 85000, 'Standard catégorie 1'
  UNION ALL SELECT '101', 1, 2, 140000, 'Standard catégorie 2'
  UNION ALL SELECT '102', 1, 2, 140000, 'Standard catégorie 2'
  UNION ALL SELECT '103', 1, 2, 140000, 'Standard catégorie 2'
  UNION ALL SELECT '104', 1, 2, 140000, 'Standard catégorie 2'
  UNION ALL SELECT '105', 1, 2, 140000, 'Standard catégorie 2'
  UNION ALL SELECT '106', 1, 2, 140000, 'Standard catégorie 2'
  UNION ALL SELECT '107', 1, 2, 140000, 'Standard catégorie 2'
  UNION ALL SELECT '108', 1, 2, 140000, 'Standard catégorie 2'
  UNION ALL SELECT '109', 1, 2, 140000, 'Standard catégorie 2'
  UNION ALL SELECT '110', 1, 2, 140000, 'Standard catégorie 2'
  UNION ALL SELECT '111', 1, 2, 140000, 'Standard catégorie 2'
  UNION ALL SELECT '112', 1, 2, 140000, 'Standard catégorie 2'
  UNION ALL SELECT '113', 1, 2, 140000, 'Standard catégorie 2'
  UNION ALL SELECT '201', 2, 2, 140000, 'Standard catégorie 2'
  UNION ALL SELECT '202', 2, 2, 140000, 'Standard catégorie 2'
  UNION ALL SELECT '203', 2, 2, 140000, 'Standard catégorie 2'
  UNION ALL SELECT '204', 2, 2, 140000, 'Standard catégorie 2'
  UNION ALL SELECT '205', 2, 2, 140000, 'Standard catégorie 2'
  UNION ALL SELECT '208', 2, 2, 140000, 'Standard catégorie 2'
  UNION ALL SELECT '209', 2, 2, 140000, 'Standard catégorie 2'
  UNION ALL SELECT '210', 2, 2, 140000, 'Standard catégorie 2'
  UNION ALL SELECT '211', 2, 2, 140000, 'Standard catégorie 2'
  UNION ALL SELECT '301', 3, 2, 155000, 'Supérieure'
  UNION ALL SELECT '302', 3, 2, 155000, 'Supérieure'
  UNION ALL SELECT '307', 3, 2, 155000, 'Supérieure'
  UNION ALL SELECT '308', 3, 2, 155000, 'Supérieure'
  UNION ALL SELECT '309', 3, 2, 155000, 'Supérieure'
  UNION ALL SELECT '310', 3, 2, 155000, 'Supérieure'
  UNION ALL SELECT '303', 3, 4, 185000, 'Suite'
  UNION ALL SELECT '304', 3, 4, 185000, 'Suite'
  UNION ALL SELECT '206', 2, 4, 275000, 'Appartement familial'
  UNION ALL SELECT '207', 2, 4, 275000, 'Appartement familial'
  UNION ALL SELECT '305', 3, 4, 275000, 'Appartement familial'
  UNION ALL SELECT '306', 3, 4, 275000, 'Appartement familial'
  UNION ALL SELECT '401', 1, 2, 185000, 'Deluxe vue piscine'
  UNION ALL SELECT '402', 1, 2, 185000, 'Deluxe vue piscine'
  UNION ALL SELECT '403', 1, 2, 185000, 'Deluxe vue piscine'
  UNION ALL SELECT '404', 1, 2, 185000, 'Deluxe vue piscine'
  UNION ALL SELECT '405', 1, 2, 185000, 'Deluxe vue piscine'
  UNION ALL SELECT '406', 1, 2, 185000, 'Deluxe vue piscine'
  UNION ALL SELECT '501', 2, 2, 185000, 'Deluxe vue piscine'
  UNION ALL SELECT '502', 2, 2, 185000, 'Deluxe vue piscine'
  UNION ALL SELECT '503', 2, 2, 185000, 'Deluxe vue piscine'
  UNION ALL SELECT '504', 2, 2, 185000, 'Deluxe vue piscine'
  UNION ALL SELECT '505', 2, 2, 185000, 'Deluxe vue piscine'
  UNION ALL SELECT '506', 2, 2, 185000, 'Deluxe vue piscine'
  UNION ALL SELECT '407', 1, 2, 170000, 'Deluxe vue postérieure'
  UNION ALL SELECT '408', 1, 2, 170000, 'Deluxe vue postérieure'
  UNION ALL SELECT '409', 1, 2, 170000, 'Deluxe vue postérieure'
  UNION ALL SELECT '410', 1, 2, 170000, 'Deluxe vue postérieure'
  UNION ALL SELECT '508', 2, 2, 170000, 'Deluxe vue postérieure'
  UNION ALL SELECT '509', 2, 2, 170000, 'Deluxe vue postérieure'
  UNION ALL SELECT '510', 2, 2, 170000, 'Deluxe vue postérieure'
  UNION ALL SELECT '511', 2, 2, 170000, 'Deluxe vue postérieure'
  UNION ALL SELECT '601', 3, 6, 400000, 'Appartement 125 m²'
  UNION ALL SELECT '603', 3, 6, 400000, 'Appartement 125 m²'
  UNION ALL SELECT '602', 3, 6, 450000, 'Appartement 150 m²'
) AS room_data
JOIN room_types rt ON rt.nom = room_data.type_nom
WHERE NOT EXISTS (
  SELECT 1
  FROM rooms existing
  WHERE existing.numero = room_data.numero
);

CREATE TABLE IF NOT EXISTS hotel_societes (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  client_id BIGINT UNSIGNED NOT NULL,
  nom_societe VARCHAR(150) NOT NULL,
  adresse TEXT NOT NULL,
  nif VARCHAR(100) DEFAULT NULL,
  stat VARCHAR(100) DEFAULT NULL,
  rcs VARCHAR(100) DEFAULT NULL,
  cif VARCHAR(100) DEFAULT NULL,
  telephone VARCHAR(50) NOT NULL,
  email VARCHAR(150) NOT NULL,
  created_at TIMESTAMP NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  UNIQUE KEY uq_hotel_societes_client (client_id),
  CONSTRAINT fk_hotel_societes_client
    FOREIGN KEY (client_id) REFERENCES clients (id)
    ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS hotel_tour_operators (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  client_id BIGINT UNSIGNED NOT NULL,
  nom_societe VARCHAR(150) NOT NULL,
  adresse TEXT NOT NULL,
  nif VARCHAR(100) DEFAULT NULL,
  stat VARCHAR(100) DEFAULT NULL,
  rcs VARCHAR(100) DEFAULT NULL,
  cif VARCHAR(100) DEFAULT NULL,
  telephone VARCHAR(50) NOT NULL,
  email VARCHAR(150) NOT NULL,
  reference_client VARCHAR(100) NOT NULL,
  created_at TIMESTAMP NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  UNIQUE KEY uq_hotel_tour_operators_client (client_id),
  UNIQUE KEY uq_hotel_tour_operators_reference (reference_client),
  CONSTRAINT fk_hotel_tour_operators_client
    FOREIGN KEY (client_id) REFERENCES clients (id)
    ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS hotel_occupants (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  reservation_id BIGINT UNSIGNED NOT NULL,
  room_id BIGINT UNSIGNED NOT NULL,
  client_id BIGINT UNSIGNED DEFAULT NULL,
  nom VARCHAR(100) NOT NULL,
  prenom VARCHAR(100) DEFAULT NULL,
  telephone VARCHAR(50) DEFAULT NULL,
  email VARCHAR(150) DEFAULT NULL,
  date_naissance DATE DEFAULT NULL,
  type_piece VARCHAR(50) DEFAULT NULL,
  numero_piece VARCHAR(100) DEFAULT NULL,
  created_at TIMESTAMP NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  KEY idx_hotel_occupants_reservation (reservation_id),
  KEY idx_hotel_occupants_room (room_id),
  KEY idx_hotel_occupants_client (client_id),
  CONSTRAINT fk_hotel_occupants_reservation
    FOREIGN KEY (reservation_id) REFERENCES reservations (id)
    ON DELETE CASCADE,
  CONSTRAINT fk_hotel_occupants_room
    FOREIGN KEY (room_id) REFERENCES rooms (id)
    ON DELETE RESTRICT,
  CONSTRAINT fk_hotel_occupants_client
    FOREIGN KEY (client_id) REFERENCES clients (id)
    ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
