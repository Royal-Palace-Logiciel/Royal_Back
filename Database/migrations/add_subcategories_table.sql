-- Migration: Add subcategories table for Restaurant Stock
-- Date: 2026-08-27
-- Description: Creates subcategories table and updates products table to support hierarchical categories

-- Create subcategories table
CREATE TABLE IF NOT EXISTS `subcategories` (
  `id` bigint(20) UNSIGNED NOT NULL AUTO_INCREMENT,
  `category_id` bigint(20) UNSIGNED NOT NULL,
  `nom` varchar(100) NOT NULL,
  `created_at` datetime DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `idx_subcategories_category_id` (`category_id`),
  CONSTRAINT `fk_subcategories_category` FOREIGN KEY (`category_id`) REFERENCES `categories` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

-- Add subcategory_id to products table
ALTER TABLE `products`
ADD COLUMN IF NOT EXISTS `subcategory_id` bigint(20) UNSIGNED NULL AFTER `category_id`;

SET @index_exists = (
  SELECT COUNT(*)
  FROM information_schema.STATISTICS
  WHERE TABLE_SCHEMA = DATABASE()
    AND TABLE_NAME = 'products'
    AND INDEX_NAME = 'idx_products_subcategory_id'
);
SET @sql = IF(
  @index_exists = 0,
  'ALTER TABLE `products` ADD KEY `idx_products_subcategory_id` (`subcategory_id`)',
  'SELECT 1'
);
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

SET @foreign_key_exists = (
  SELECT COUNT(*)
  FROM information_schema.TABLE_CONSTRAINTS
  WHERE CONSTRAINT_SCHEMA = DATABASE()
    AND TABLE_NAME = 'products'
    AND CONSTRAINT_NAME = 'fk_products_subcategory'
    AND CONSTRAINT_TYPE = 'FOREIGN KEY'
);
SET @sql = IF(
  @foreign_key_exists = 0,
  'ALTER TABLE `products` ADD CONSTRAINT `fk_products_subcategory` FOREIGN KEY (`subcategory_id`) REFERENCES `subcategories` (`id`) ON DELETE SET NULL',
  'SELECT 1'
);
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

-- Add portion-related fields to products table for portion-based stock management
ALTER TABLE `products`
ADD COLUMN IF NOT EXISTS `portion_size` decimal(10,2) NULL DEFAULT NULL COMMENT 'Standard portion size for the product',
ADD COLUMN IF NOT EXISTS `portion_unite` varchar(20) NULL DEFAULT NULL COMMENT 'Unit for portion size (g, ml, etc.)';

-- Subcategories are inserted by the application or a separate seed script.
