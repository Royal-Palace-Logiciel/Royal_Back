-- Add new fields to reservations table for enhanced functionality.
SET @reservation_pdj_exists = (SELECT COUNT(*) FROM information_schema.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'reservations' AND COLUMN_NAME = 'pdj_inclus');
SET @reservation_pdj_sql = IF(@reservation_pdj_exists = 0, 'ALTER TABLE reservations ADD COLUMN pdj_inclus BOOLEAN NOT NULL DEFAULT FALSE', 'SELECT 1');
PREPARE reservation_pdj_statement FROM @reservation_pdj_sql;
EXECUTE reservation_pdj_statement;
DEALLOCATE PREPARE reservation_pdj_statement;

SET @reservation_type_exists = (SELECT COUNT(*) FROM information_schema.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'reservations' AND COLUMN_NAME = 'type_reservation');
SET @reservation_type_sql = IF(@reservation_type_exists = 0, 'ALTER TABLE reservations ADD COLUMN type_reservation ENUM(''BOOKING'', ''ON_SITE'') NOT NULL DEFAULT ''BOOKING''', 'SELECT 1');
PREPARE reservation_type_statement FROM @reservation_type_sql;
EXECUTE reservation_type_statement;
DEALLOCATE PREPARE reservation_type_statement;

SET @reservation_laundry_exists = (SELECT COUNT(*) FROM information_schema.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'reservations' AND COLUMN_NAME = 'laundry_included');
SET @reservation_laundry_sql = IF(@reservation_laundry_exists = 0, 'ALTER TABLE reservations ADD COLUMN laundry_included BOOLEAN NOT NULL DEFAULT FALSE', 'SELECT 1');
PREPARE reservation_laundry_statement FROM @reservation_laundry_sql;
EXECUTE reservation_laundry_statement;
DEALLOCATE PREPARE reservation_laundry_statement;

SET @reservation_laundry_price_exists = (SELECT COUNT(*) FROM information_schema.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'reservations' AND COLUMN_NAME = 'laundry_price');
SET @reservation_laundry_price_sql = IF(@reservation_laundry_price_exists = 0, 'ALTER TABLE reservations ADD COLUMN laundry_price BIGINT NOT NULL DEFAULT 0', 'SELECT 1');
PREPARE reservation_laundry_price_statement FROM @reservation_laundry_price_sql;
EXECUTE reservation_laundry_price_statement;
DEALLOCATE PREPARE reservation_laundry_price_statement;

SET @reservation_manual_price_exists = (SELECT COUNT(*) FROM information_schema.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'reservations' AND COLUMN_NAME = 'manual_price');
SET @reservation_manual_price_sql = IF(@reservation_manual_price_exists = 0, 'ALTER TABLE reservations ADD COLUMN manual_price BIGINT NOT NULL DEFAULT 0', 'SELECT 1');
PREPARE reservation_manual_price_statement FROM @reservation_manual_price_sql;
EXECUTE reservation_manual_price_statement;
DEALLOCATE PREPARE reservation_manual_price_statement;

SET @reservation_exchange_rate_exists = (SELECT COUNT(*) FROM information_schema.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'reservations' AND COLUMN_NAME = 'exchange_rate');
SET @reservation_exchange_rate_sql = IF(@reservation_exchange_rate_exists = 0, 'ALTER TABLE reservations ADD COLUMN exchange_rate DECIMAL(10,2) NOT NULL DEFAULT 39.76', 'SELECT 1');
PREPARE reservation_exchange_rate_statement FROM @reservation_exchange_rate_sql;
EXECUTE reservation_exchange_rate_statement;
DEALLOCATE PREPARE reservation_exchange_rate_statement;

-- Update reservation status to support CHECKED_IN using a more reliable method
SET @column_type = (SELECT COLUMN_TYPE FROM information_schema.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'reservations' AND COLUMN_NAME = 'statut');
SET @has_checked_in = IF(@column_type LIKE '%CHECKED_IN%', 1, 0);

SET @update_status_sql = IF(@has_checked_in = 0, 
  'ALTER TABLE reservations MODIFY COLUMN statut ENUM("EN_ATTENTE", "CONFIRMEE", "CHECKED_IN", "EN_COURS", "ANNULEE", "TERMINEE", "NO_SHOW") NOT NULL DEFAULT "CONFIRMEE"', 
  'SELECT 1');
PREPARE update_status_statement FROM @update_status_sql;
EXECUTE update_status_statement;
DEALLOCATE PREPARE update_status_statement;

-- Add quantity fields to equipments table.
SET @equipment_quantity_exists = (SELECT COUNT(*) FROM information_schema.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'equipments' AND COLUMN_NAME = 'quantite');
SET @equipment_quantity_sql = IF(@equipment_quantity_exists = 0, 'ALTER TABLE equipments ADD COLUMN quantite INT NOT NULL DEFAULT 1', 'SELECT 1');
PREPARE equipment_quantity_statement FROM @equipment_quantity_sql;
EXECUTE equipment_quantity_statement;
DEALLOCATE PREPARE equipment_quantity_statement;

SET @equipment_consumable_exists = (SELECT COUNT(*) FROM information_schema.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'equipments' AND COLUMN_NAME = 'is_consumable');
SET @equipment_consumable_sql = IF(@equipment_consumable_exists = 0, 'ALTER TABLE equipments ADD COLUMN is_consumable BOOLEAN NOT NULL DEFAULT FALSE', 'SELECT 1');
PREPARE equipment_consumable_statement FROM @equipment_consumable_sql;
EXECUTE equipment_consumable_statement;
DEALLOCATE PREPARE equipment_consumable_statement;

-- Add collaboration fields to maintenance_workers table.
SET @worker_photo_exists = (SELECT COUNT(*) FROM information_schema.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'maintenance_workers' AND COLUMN_NAME = 'photo_url');
SET @worker_photo_sql = IF(@worker_photo_exists = 0, 'ALTER TABLE maintenance_workers ADD COLUMN photo_url VARCHAR(255) NULL', 'SELECT 1');
PREPARE worker_photo_statement FROM @worker_photo_sql;
EXECUTE worker_photo_statement;
DEALLOCATE PREPARE worker_photo_statement;

SET @worker_id_photo_exists = (SELECT COUNT(*) FROM information_schema.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'maintenance_workers' AND COLUMN_NAME = 'id_photo_url');
SET @worker_id_photo_sql = IF(@worker_id_photo_exists = 0, 'ALTER TABLE maintenance_workers ADD COLUMN id_photo_url VARCHAR(255) NULL', 'SELECT 1');
PREPARE worker_id_photo_statement FROM @worker_id_photo_sql;
EXECUTE worker_id_photo_statement;
DEALLOCATE PREPARE worker_id_photo_statement;

SET @worker_contract_exists = (SELECT COUNT(*) FROM information_schema.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'maintenance_workers' AND COLUMN_NAME = 'contract_url');
SET @worker_contract_sql = IF(@worker_contract_exists = 0, 'ALTER TABLE maintenance_workers ADD COLUMN contract_url VARCHAR(255) NULL', 'SELECT 1');
PREPARE worker_contract_statement FROM @worker_contract_sql;
EXECUTE worker_contract_statement;
DEALLOCATE PREPARE worker_contract_statement;

SET @worker_quote_exists = (SELECT COUNT(*) FROM information_schema.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'maintenance_workers' AND COLUMN_NAME = 'quote_url');
SET @worker_quote_sql = IF(@worker_quote_exists = 0, 'ALTER TABLE maintenance_workers ADD COLUMN quote_url VARCHAR(255) NULL', 'SELECT 1');
PREPARE worker_quote_statement FROM @worker_quote_sql;
EXECUTE worker_quote_statement;
DEALLOCATE PREPARE worker_quote_statement;

SET @worker_time_slot_exists = (SELECT COUNT(*) FROM information_schema.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'maintenance_workers' AND COLUMN_NAME = 'time_slot');
SET @worker_time_slot_sql = IF(@worker_time_slot_exists = 0, 'ALTER TABLE maintenance_workers ADD COLUMN time_slot VARCHAR(100) NULL', 'SELECT 1');
PREPARE worker_time_slot_statement FROM @worker_time_slot_sql;
EXECUTE worker_time_slot_statement;
DEALLOCATE PREPARE worker_time_slot_statement;

-- Update housekeeping task types
ALTER TABLE housekeeping_tasks
  MODIFY COLUMN type_tache ENUM('POST_OCCUPANCY', 'AFTER_OCCUPANCY', 'DEEP_CLEANING', 'EXCEPTIONAL', 'CHAMBRE','ESCALIER_RAMPE','DECORATIONS','MUR','PLAFOND','SOL_MOQUETTE','MEUBLES','COULOIR','TERASSE','TOILETTES') NOT NULL;
