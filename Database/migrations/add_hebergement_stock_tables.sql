-- Migration: Add Hébergement stock tables
-- Date: 2025-01-13
-- Description: Creates tables for managing accommodation stock inventory

-- Create hebergement_products table
CREATE TABLE IF NOT EXISTS `hebergement_products` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `nom` varchar(255) NOT NULL,
  `categorie` varchar(100) DEFAULT 'Hébergement',
  `prix` decimal(10,2) DEFAULT 0.00,
  `source_module` varchar(50) DEFAULT 'HEBERGEMENT',
  `created_at` timestamp DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Create hebergement_stock table
CREATE TABLE IF NOT EXISTS `hebergement_stock` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `product_id` int(11) NOT NULL,
  `quantite` int(11) DEFAULT 0,
  `seuil_minimum` int(11) DEFAULT 5,
  `unite` varchar(50) DEFAULT 'unités',
  `created_at` timestamp DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `unique_product_stock` (`product_id`),
  FOREIGN KEY (`product_id`) REFERENCES `hebergement_products` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
