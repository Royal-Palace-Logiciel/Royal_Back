-- Give shared products an owning module to keep Hotel stock out of the Restaurant menu.
SET @dbname = DATABASE();
SET @column_exists = (
  SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS
  WHERE TABLE_SCHEMA = @dbname AND TABLE_NAME = 'products' AND COLUMN_NAME = 'source_module'
);
SET @sql = IF(
  @column_exists = 0,
  'ALTER TABLE products ADD COLUMN source_module VARCHAR(30) NULL',
  'SELECT ''Column products.source_module already exists'' AS info'
);
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

-- Existing equipment/product links and Hotel-generated product codes identify Hotel-owned records.
UPDATE products p
SET p.source_module = 'HOTEL'
WHERE p.source_module IS NULL
  AND (
    p.code LIKE 'HOTEL-%'
    OR p.code LIKE 'HEBERGEMENT-LEGACY-%'
    OR EXISTS (SELECT 1 FROM equipments e WHERE e.product_id = p.id)
  );

-- The legacy shared catalog was used by the Restaurant. Keep those items visible there;
-- Bar & Lounge and Alcohol use their own bar_products / alcool_products tables.
UPDATE products
SET source_module = 'RESTAURANT'
WHERE source_module IS NULL;
