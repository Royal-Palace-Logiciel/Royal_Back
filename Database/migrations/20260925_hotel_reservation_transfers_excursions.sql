-- Transferts et excursions saisis manuellement dans une reservation Hotel.
-- services_extras : tableau JSON [{ type: 'TRANSFERT'|'EXCURSION', description, date, heure, personnes, prix }]
-- services_extras_total : somme des prix (Ar), deja incluse dans montant_total.
SET @extras_exists = (SELECT COUNT(*) FROM information_schema.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'reservations' AND COLUMN_NAME = 'services_extras');
SET @extras_sql = IF(@extras_exists = 0, 'ALTER TABLE reservations ADD COLUMN services_extras TEXT NULL', 'SELECT 1');
PREPARE extras_statement FROM @extras_sql;
EXECUTE extras_statement;
DEALLOCATE PREPARE extras_statement;

SET @extras_total_exists = (SELECT COUNT(*) FROM information_schema.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'reservations' AND COLUMN_NAME = 'services_extras_total');
SET @extras_total_sql = IF(@extras_total_exists = 0, 'ALTER TABLE reservations ADD COLUMN services_extras_total DECIMAL(12,2) NOT NULL DEFAULT 0', 'SELECT 1');
PREPARE extras_total_statement FROM @extras_total_sql;
EXECUTE extras_total_statement;
DEALLOCATE PREPARE extras_total_statement;
