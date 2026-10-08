-- Add GRATUIT option to type_reservation enum in reservations table
SET @enum_values = (SELECT COLUMN_TYPE FROM information_schema.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'reservations' AND COLUMN_NAME = 'type_reservation');
SET @has_gratuit = IF(@enum_values LIKE '%GRATUIT%', 1, 0);

SET @update_enum_sql = IF(@has_gratuit = 0, 
  'ALTER TABLE reservations MODIFY COLUMN type_reservation ENUM("BOOKING", "ON_SITE", "GRATUIT") NOT NULL DEFAULT "BOOKING"', 
  'SELECT 1');
PREPARE update_enum_statement FROM @update_enum_sql;
EXECUTE update_enum_statement;
DEALLOCATE PREPARE update_enum_statement;
