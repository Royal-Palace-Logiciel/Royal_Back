-- Migration: HOTEL Stock Movement History Enhancement
-- MySQL-compatible version (no "IF NOT EXISTS" on ALTER TABLE)
-- Run this with: mysql -u root -p hda < Database/migrations/20260929_hotel_stock_movement_history.sql

-- 1. Ensure hotel stock location exists (id=5)
INSERT IGNORE INTO stock_locations (id, nom) VALUES (5, 'Hôtel');

-- 2. Add columns to stock_movements (MySQL-compatible)
SET @dbname = DATABASE();

SET @col_exists = (SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS
  WHERE TABLE_SCHEMA = @dbname AND TABLE_NAME = 'stock_movements' AND COLUMN_NAME = 'stock_after');
SET @sql = IF(@col_exists = 0,
  'ALTER TABLE stock_movements ADD COLUMN stock_after DECIMAL(15,2) NULL COMMENT ''Stock quantity after this movement''',
  'SELECT ''Column stock_after already exists'' AS info');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

SET @col_exists = (SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS
  WHERE TABLE_SCHEMA = @dbname AND TABLE_NAME = 'stock_movements' AND COLUMN_NAME = 'motif');
SET @sql = IF(@col_exists = 0,
  'ALTER TABLE stock_movements ADD COLUMN motif VARCHAR(255) NULL COMMENT ''Reason/motif for the movement''',
  'SELECT ''Column motif already exists'' AS info');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

SET @col_exists = (SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS
  WHERE TABLE_SCHEMA = @dbname AND TABLE_NAME = 'stock_movements' AND COLUMN_NAME = 'user_id');
SET @sql = IF(@col_exists = 0,
  'ALTER TABLE stock_movements ADD COLUMN user_id BIGINT UNSIGNED NULL COMMENT ''User who performed the movement''',
  'SELECT ''Column user_id already exists'' AS info');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

-- 3. Add index for efficient history queries
SET @idx_exists = (SELECT COUNT(*) FROM INFORMATION_SCHEMA.STATISTICS
  WHERE TABLE_SCHEMA = @dbname AND TABLE_NAME = 'stock_movements' AND INDEX_NAME = 'idx_stock_movements_product_location_date');
SET @sql = IF(@idx_exists = 0,
  'CREATE INDEX idx_stock_movements_product_location_date ON stock_movements (product_id, location_id, created_at)',
  'SELECT ''Index idx_stock_movements_product_location_date already exists'' AS info');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

-- 4. Add product_id to equipments
SET @col_exists = (SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS
  WHERE TABLE_SCHEMA = @dbname AND TABLE_NAME = 'equipments' AND COLUMN_NAME = 'product_id');
SET @sql = IF(@col_exists = 0,
  'ALTER TABLE equipments ADD COLUMN product_id BIGINT UNSIGNED NULL COMMENT ''Link to products table''',
  'SELECT ''Column equipments.product_id already exists'' AS info');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

-- 5. Backfill equipments.product_id by matching products.code
UPDATE equipments e
SET product_id = (
  SELECT p.id FROM products p 
  WHERE p.code = e.code 
  LIMIT 1
)
WHERE e.product_id IS NULL AND e.code IS NOT NULL;

-- 6. Backfill equipments.product_id by matching products.nom (fallback)
UPDATE equipments e
SET product_id = (
  SELECT p.id FROM products p 
  WHERE p.nom = e.nom 
  LIMIT 1
)
WHERE e.product_id IS NULL;

-- 7. Add stock_deducted_at to housekeeping_tasks
SET @col_exists = (SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS
  WHERE TABLE_SCHEMA = @dbname AND TABLE_NAME = 'housekeeping_tasks' AND COLUMN_NAME = 'stock_deducted_at');
SET @sql = IF(@col_exists = 0,
  'ALTER TABLE housekeeping_tasks ADD COLUMN stock_deducted_at DATETIME NULL COMMENT ''When stock was deducted for this task''',
  'SELECT ''Column housekeeping_tasks.stock_deducted_at already exists'' AS info');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

-- 8. Add stock_deducted_at to room_maintenance
SET @col_exists = (SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS
  WHERE TABLE_SCHEMA = @dbname AND TABLE_NAME = 'room_maintenance' AND COLUMN_NAME = 'stock_deducted_at');
SET @sql = IF(@col_exists = 0,
  'ALTER TABLE room_maintenance ADD COLUMN stock_deducted_at DATETIME NULL COMMENT ''When stock was deducted for this maintenance''',
  'SELECT ''Column room_maintenance.stock_deducted_at already exists'' AS info');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

-- 9. Merge duplicate stocks rows with backup (idempotent)
CREATE TABLE IF NOT EXISTS stocks_merge_backup (
  id INT AUTO_INCREMENT PRIMARY KEY,
  original_id INT,
  product_id INT,
  location_id INT,
  original_quantite DECIMAL(15,2),
  merged_quantite DECIMAL(15,2),
  merged_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

INSERT INTO stocks_merge_backup (original_id, product_id, location_id, original_quantite, merged_quantite)
SELECT 
  s.id as original_id,
  s.product_id,
  s.location_id,
  s.quantite as original_quantite,
  merged.total_quantite as merged_quantite
FROM stocks s
INNER JOIN (
  SELECT 
    MIN(id) as keep_id,
    product_id,
    location_id,
    SUM(quantite) as total_quantite
  FROM stocks
  GROUP BY product_id, location_id
  HAVING COUNT(*) > 1
) merged ON s.product_id = merged.product_id AND s.location_id = merged.location_id AND s.id != merged.keep_id
WHERE NOT EXISTS (
  SELECT 1 FROM stocks_merge_backup b 
  WHERE b.original_id = s.id
);

DELETE s FROM stocks s
INNER JOIN (
  SELECT 
    MIN(id) as keep_id,
    product_id,
    location_id
  FROM stocks
  GROUP BY product_id, location_id
  HAVING COUNT(*) > 1
) dup ON s.product_id = dup.product_id AND s.location_id = dup.location_id AND s.id != dup.keep_id;

UPDATE stocks s
INNER JOIN (
  SELECT 
    MIN(id) as keep_id,
    product_id,
    location_id,
    SUM(quantite) as total_quantite
  FROM stocks
  GROUP BY product_id, location_id
  HAVING COUNT(*) > 1
) merged ON s.id = merged.keep_id
SET s.quantite = merged.total_quantite;

-- 10. Add unique key to stocks
SET @uk_exists = (SELECT COUNT(*) FROM INFORMATION_SCHEMA.STATISTICS
  WHERE TABLE_SCHEMA = @dbname AND TABLE_NAME = 'stocks' AND INDEX_NAME = 'uk_stocks_product_location');
SET @sql = IF(@uk_exists = 0,
  'ALTER TABLE stocks ADD UNIQUE KEY uk_stocks_product_location (product_id, location_id)',
  'SELECT ''Unique key uk_stocks_product_location already exists'' AS info');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

-- 11. Backfill stock movements for hotel stock (location_id=5) to match real stock
INSERT INTO stock_movements (product_id, location_id, type_mouvement, quantite, source_module, motif, created_at, stock_after)
SELECT 
  s.product_id,
  s.location_id,
  'ENTREE' as type_mouvement,
  s.quantite - COALESCE(movement_sum.total_in, 0) + COALESCE(movement_sum.total_out, 0) as quantite,
  'STOCK_MANUEL' as source_module,
  'Solde initial (ajustement)' as motif,
  NOW() as created_at,
  s.quantite as stock_after
FROM stocks s
LEFT JOIN (
  SELECT 
    product_id,
    location_id,
    SUM(CASE WHEN type_mouvement = 'ENTREE' THEN quantite ELSE 0 END) as total_in,
    SUM(CASE WHEN type_mouvement = 'SORTIE' THEN quantite ELSE 0 END) as total_out
  FROM stock_movements
  WHERE location_id = 5
  GROUP BY product_id, location_id
) movement_sum ON s.product_id = movement_sum.product_id AND s.location_id = movement_sum.location_id
WHERE s.location_id = 5
  AND (movement_sum.total_in IS NULL OR movement_sum.total_out IS NULL 
       OR s.quantite != (COALESCE(movement_sum.total_in, 0) - COALESCE(movement_sum.total_out, 0)))
  AND NOT EXISTS (
    SELECT 1 FROM stock_movements m2 
    WHERE m2.product_id = s.product_id 
      AND m2.location_id = s.location_id 
      AND m2.motif = 'Solde initial (ajustement)'
  );