-- ============================================================
-- Module Alcool — base de données dédiée et séparée du bar
-- ============================================================

SET FOREIGN_KEY_CHECKS = 0;

DROP TABLE IF EXISTS `alcool_order_items`;
DROP TABLE IF EXISTS `alcool_orders`;
DROP TABLE IF EXISTS `alcool_transactions`;
DROP TABLE IF EXISTS `alcool_stock`;
DROP TABLE IF EXISTS `alcool_products`;
DROP TABLE IF EXISTS `alcool_sessions`;
DROP TABLE IF EXISTS `alcool_cashiers`;
DROP TABLE IF EXISTS `alcool_tables`;
DROP TABLE IF EXISTS `alcool_clients`;

SET FOREIGN_KEY_CHECKS = 1;

CREATE TABLE `alcool_products` (
  `id` bigint(20) UNSIGNED NOT NULL AUTO_INCREMENT,
  `nom` varchar(150) NOT NULL,
  `ingredients` text DEFAULT NULL,
  `prix` decimal(10,2) NOT NULL DEFAULT 0.00,
  `categorie` varchar(50) DEFAULT 'Alcools',
  `alcool` tinyint(1) DEFAULT 1,
  `type_produit` varchar(50) DEFAULT 'PRODUIT_FINI',
  `source_module` varchar(50) DEFAULT 'ALCOOL',
  `created_at` datetime DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `idx_alcool_products_categorie` (`categorie`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

CREATE TABLE `alcool_stock` (
  `id` bigint(20) UNSIGNED NOT NULL AUTO_INCREMENT,
  `product_id` bigint(20) UNSIGNED NOT NULL,
  `quantite` int(11) NOT NULL DEFAULT 0,
  `seuil_minimum` int(11) DEFAULT 5,
  `unite` varchar(50) DEFAULT 'unités',
  `updated_at` datetime DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uk_alcool_stock_product_id` (`product_id`),
  CONSTRAINT `fk_alcool_stock_product` FOREIGN KEY (`product_id`) REFERENCES `alcool_products` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

CREATE TABLE `alcool_cashiers` (
  `id` bigint(20) UNSIGNED NOT NULL AUTO_INCREMENT,
  `nom` varchar(100) NOT NULL,
  `statut` enum('ACTIF','INACTIF') DEFAULT 'ACTIF',
  `created_at` datetime DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

CREATE TABLE `alcool_sessions` (
  `id` bigint(20) UNSIGNED NOT NULL AUTO_INCREMENT,
  `cashier_id` bigint(20) UNSIGNED DEFAULT NULL,
  `user_id` bigint(20) UNSIGNED DEFAULT NULL,
  `fond_initial` decimal(10,2) DEFAULT 0.00,
  `fond_final` decimal(10,2) DEFAULT NULL,
  `ouverture_at` datetime DEFAULT CURRENT_TIMESTAMP,
  `fermeture_at` datetime DEFAULT NULL,
  PRIMARY KEY (`id`),
  KEY `idx_alcool_sessions_cashier_id` (`cashier_id`),
  CONSTRAINT `fk_alcool_sessions_cashier` FOREIGN KEY (`cashier_id`) REFERENCES `alcool_cashiers` (`id`) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

CREATE TABLE `alcool_clients` (
  `id` bigint(20) UNSIGNED NOT NULL AUTO_INCREMENT,
  `nom` varchar(100) NOT NULL,
  `prenom` varchar(100) DEFAULT NULL,
  `telephone` varchar(20) DEFAULT NULL,
  `email` varchar(100) DEFAULT NULL,
  `adresse` text DEFAULT NULL,
  `statut` enum('ACTIF','INACTIF') DEFAULT 'ACTIF',
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

CREATE TABLE `alcool_tables` (
  `id` bigint(20) UNSIGNED NOT NULL AUTO_INCREMENT,
  `numero` varchar(20) DEFAULT NULL,
  `capacite` int(11) DEFAULT NULL,
  `statut` varchar(30) DEFAULT 'LIBRE',
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

CREATE TABLE `alcool_transactions` (
  `id` bigint(20) UNSIGNED NOT NULL AUTO_INCREMENT,
  `session_id` bigint(20) UNSIGNED DEFAULT NULL,
  `client_id` bigint(20) UNSIGNED DEFAULT NULL,
  `table_id` bigint(20) UNSIGNED DEFAULT NULL,
  `product_id` bigint(20) UNSIGNED NOT NULL,
  `quantite` int(11) NOT NULL DEFAULT 1,
  `prix_unitaire` decimal(10,2) NOT NULL,
  `montant` decimal(10,2) GENERATED ALWAYS AS (`quantite` * `prix_unitaire`) STORED,
  `statut` enum('EN_ATTENTE','EN_COURS','SERVIE','PAYEE','ANNULEE') NOT NULL DEFAULT 'EN_ATTENTE',
  `created_at` datetime DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `idx_alcool_transactions_session_id` (`session_id`),
  KEY `idx_alcool_transactions_product_id` (`product_id`),
  KEY `idx_alcool_transactions_client_id` (`client_id`),
  KEY `idx_alcool_transactions_table_id` (`table_id`),
  CONSTRAINT `fk_alcool_transactions_session` FOREIGN KEY (`session_id`) REFERENCES `alcool_sessions` (`id`) ON DELETE SET NULL,
  CONSTRAINT `fk_alcool_transactions_product` FOREIGN KEY (`product_id`) REFERENCES `alcool_products` (`id`) ON DELETE RESTRICT,
  CONSTRAINT `fk_alcool_transactions_client` FOREIGN KEY (`client_id`) REFERENCES `alcool_clients` (`id`) ON DELETE SET NULL,
  CONSTRAINT `fk_alcool_transactions_table` FOREIGN KEY (`table_id`) REFERENCES `alcool_tables` (`id`) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

CREATE TABLE `alcool_orders` (
  `id` bigint(20) UNSIGNED NOT NULL AUTO_INCREMENT,
  `client_name` varchar(150) DEFAULT NULL,
  `table_id` bigint(20) UNSIGNED DEFAULT NULL,
  `statut` varchar(30) DEFAULT 'EN_ATTENTE',
  `montant_total` decimal(10,2) DEFAULT 0.00,
  `created_at` datetime DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `idx_alcool_orders_table_id` (`table_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

CREATE TABLE `alcool_order_items` (
  `id` bigint(20) UNSIGNED NOT NULL AUTO_INCREMENT,
  `order_id` bigint(20) UNSIGNED NOT NULL,
  `nom` varchar(150) DEFAULT NULL,
  `quantite` int(11) DEFAULT 1,
  `prix` decimal(10,2) DEFAULT 0.00,
  `created_at` datetime DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `idx_alcool_order_items_order_id` (`order_id`),
  CONSTRAINT `fk_alcool_order_items_order` FOREIGN KEY (`order_id`) REFERENCES `alcool_orders` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;


-- Ajout des colonnes manquantes sur alcool_orders
ALTER TABLE `alcool_orders`
  ADD COLUMN `nombre_personnes` INT(11) NOT NULL DEFAULT 1 AFTER `table_id`,
  ADD COLUMN `moyen_paiement` VARCHAR(30) NOT NULL DEFAULT 'ESPECES' AFTER `nombre_personnes`;

-- Lien order_id sur alcool_transactions pour un restock fiable
ALTER TABLE `alcool_transactions`
  ADD COLUMN `order_id` BIGINT(20) UNSIGNED DEFAULT NULL AFTER `table_id`,
  ADD KEY `idx_alcool_transactions_order_id` (`order_id`),
  ADD CONSTRAINT `fk_alcool_transactions_order` FOREIGN KEY (`order_id`) REFERENCES `alcool_orders` (`id`) ON DELETE CASCADE;