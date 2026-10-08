-- ============================================================
-- Bar & Lounge Module — Script SQL Optimisé et Nettoyé
-- Suppression des tables redondantes (bar_orders, bar_order_items) 
-- au profit de bar_transactions, et intégration des triggers de stock.
-- ============================================================

SET FOREIGN_KEY_CHECKS = 0;

DROP TABLE IF EXISTS `bar_transactions`;
DROP TABLE IF EXISTS `bar_stock`;
DROP TABLE IF EXISTS `bar_products`;
DROP TABLE IF EXISTS `bar_sessions`;
DROP TABLE IF EXISTS `bar_cashiers`;
DROP TABLE IF EXISTS `bar_tables`;
DROP TABLE IF EXISTS `bar_clients`;

SET FOREIGN_KEY_CHECKS = 1;

-- 1. Table des produits du bar
CREATE TABLE `bar_products` (
  `id` bigint(20) UNSIGNED NOT NULL AUTO_INCREMENT,
  `nom` varchar(150) NOT NULL,
  `ingredients` text DEFAULT NULL,
  `prix` decimal(10,2) NOT NULL DEFAULT 0.00,
  `categorie` varchar(50) DEFAULT 'Bar',
  `alcool` tinyint(1) DEFAULT 0,
  `type_produit` varchar(50) DEFAULT 'PRODUIT_FINI',
  `source_module` varchar(50) DEFAULT 'BAR',
  `created_at` datetime DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `idx_bar_products_categorie` (`categorie`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

-- 2. Table des stocks du bar
CREATE TABLE `bar_stock` (
  `id` bigint(20) UNSIGNED NOT NULL AUTO_INCREMENT,
  `product_id` bigint(20) UNSIGNED NOT NULL,
  `quantite` int(11) NOT NULL DEFAULT 0,
  `seuil_minimum` int(11) DEFAULT 5,
  `unite` varchar(50) DEFAULT 'unités',
  `updated_at` datetime DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uk_bar_stock_product_id` (`product_id`),
  CONSTRAINT `fk_bar_stock_product` FOREIGN KEY (`product_id`) REFERENCES `bar_products` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

-- 3. Table des caissiers
CREATE TABLE `bar_cashiers` (
  `id` bigint(20) UNSIGNED NOT NULL AUTO_INCREMENT,
  `nom` varchar(100) NOT NULL,
  `statut` enum('ACTIF','INACTIF') DEFAULT 'ACTIF',
  `created_at` datetime DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

-- 4. Table des sessions de caisse
CREATE TABLE `bar_sessions` (
  `id` bigint(20) UNSIGNED NOT NULL AUTO_INCREMENT,
  `cashier_id` bigint(20) UNSIGNED DEFAULT NULL,
  `user_id` bigint(20) UNSIGNED DEFAULT NULL,
  `fond_initial` decimal(10,2) DEFAULT 0.00,
  `fond_final` decimal(10,2) DEFAULT NULL,
  `ouverture_at` datetime DEFAULT CURRENT_TIMESTAMP,
  `fermeture_at` datetime DEFAULT NULL,
  PRIMARY KEY (`id`),
  KEY `idx_bar_sessions_cashier_id` (`cashier_id`),
  CONSTRAINT `fk_bar_sessions_cashier` FOREIGN KEY (`cashier_id`) REFERENCES `bar_cashiers` (`id`) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

-- 5. Table des clients du bar
CREATE TABLE `bar_clients` (
  `id` bigint(20) UNSIGNED NOT NULL AUTO_INCREMENT,
  `nom` varchar(100) NOT NULL,
  `prenom` varchar(100) DEFAULT NULL,
  `telephone` varchar(20) DEFAULT NULL,
  `email` varchar(100) DEFAULT NULL,
  `adresse` text DEFAULT NULL,
  `statut` enum('ACTIF','INACTIF') DEFAULT 'ACTIF',
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

-- 6. Table des tables du bar
CREATE TABLE `bar_tables` (
  `id` bigint(20) UNSIGNED NOT NULL AUTO_INCREMENT,
  `numero` varchar(20) DEFAULT NULL,
  `capacite` int(11) DEFAULT NULL,
  `statut` varchar(30) DEFAULT 'LIBRE',
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

-- 7. Table unique centralisée des transactions / lignes de commande
CREATE TABLE `bar_transactions` (
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
  KEY `idx_bar_transactions_session_id` (`session_id`),
  KEY `idx_bar_transactions_product_id` (`product_id`),
  KEY `idx_bar_transactions_client_id` (`client_id`),
  KEY `idx_bar_transactions_table_id` (`table_id`),
  CONSTRAINT `fk_bar_transactions_session` FOREIGN KEY (`session_id`) REFERENCES `bar_sessions` (`id`) ON DELETE SET NULL,
  CONSTRAINT `fk_bar_transactions_product` FOREIGN KEY (`product_id`) REFERENCES `bar_products` (`id`) ON DELETE RESTRICT,
  CONSTRAINT `fk_bar_transactions_client` FOREIGN KEY (`client_id`) REFERENCES `bar_clients` (`id`) ON DELETE SET NULL,
  CONSTRAINT `fk_bar_transactions_table` FOREIGN KEY (`table_id`) REFERENCES `bar_tables` (`id`) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

-- ============================================================
-- Triggers pour la gestion automatique du stock en temps réel
-- ============================================================

DELIMITER //

DROP TRIGGER IF EXISTS trg_bar_stock_after_insert//
CREATE TRIGGER trg_bar_stock_after_insert
AFTER INSERT ON bar_transactions
FOR EACH ROW
BEGIN
    IF NEW.statut IN ('SERVIE', 'PAYEE') THEN
        UPDATE bar_stock 
        SET quantite = quantite - NEW.quantite
        WHERE product_id = NEW.product_id;
    END IF;
END //

DROP TRIGGER IF EXISTS trg_bar_stock_after_update//
CREATE TRIGGER trg_bar_stock_after_update
AFTER UPDATE ON bar_transactions
FOR EACH ROW
BEGIN
    IF NEW.statut IN ('SERVIE', 'PAYEE') AND OLD.statut NOT IN ('SERVIE', 'PAYEE') THEN
        UPDATE bar_stock 
        SET quantite = quantite - NEW.quantite
        WHERE product_id = NEW.product_id;
    ELSEIF NEW.statut = 'ANNULEE' AND OLD.statut IN ('SERVIE', 'PAYEE') THEN
        UPDATE bar_stock 
        SET quantite = quantite + NEW.quantite
        WHERE product_id = NEW.product_id;
    END IF;
END //

DELIMITER ;

-- ============================================================
-- Insertion des données de test
-- ============================================================

INSERT IGNORE INTO `bar_products` (`id`, `nom`, `ingredients`, `prix`, `categorie`, `alcool`, `type_produit`, `source_module`) VALUES
(1, 'Rhum Arrangé', 'Rhum blanc, fruits tropicaux', 50.00, 'Cocktails', 1, 'PRODUIT_FINI', 'BAR'),
(2, 'Mojito', 'Rhum, menthe, citron, sucre', 35.00, 'Cocktails', 1, 'PRODUIT_FINI', 'BAR'),
(3, 'Piña Colada', 'Rhum, lait de coco, ananas', 40.00, 'Cocktails', 1, 'PRODUIT_FINI', 'BAR'),
(4, 'Margarita', 'Tequila, triple sec, citron', 45.00, 'Cocktails', 1, 'PRODUIT_FINI', 'BAR'),
(5, 'Daiquiri', 'Rhum blanc, citron frais, sucre', 38.00, 'Cocktails', 1, 'PRODUIT_FINI', 'BAR'),
(9, 'Cachaça', 'Rhum brésilien 50ml', 30.00, 'Alcools', 1, 'PRODUIT_FINI', 'BAR');

INSERT IGNORE INTO `bar_stock` (`product_id`, `quantite`, `seuil_minimum`, `unite`) VALUES
(1, 50, 10, 'bouteilles'),
(2, 100, 20, 'portions'),
(3, 75, 15, 'portions'),
(4, 60, 15, 'portions'),
(5, 80, 20, 'portions'),
(9, 100, 20, 'bouteilles');

INSERT IGNORE INTO `bar_clients` (`id`, `nom`, `prenom`, `telephone`, `email`, `statut`) VALUES
(1, 'Razafy', 'Jean', '+261 34 12 345 67', 'jean@example.com', 'ACTIF'),
(2, 'Ramanantsoa', 'Marie', '+261 32 98 765 43', 'marie@example.com', 'ACTIF'),
(3, 'Rakoto', 'Paul', '+261 33 45 678 90', 'paul@example.com', 'ACTIF'),
(4, 'Rajaonarison', 'Claire', NULL, NULL, 'ACTIF');

INSERT IGNORE INTO `bar_tables` (`id`, `numero`, `capacite`, `statut`) VALUES
(1, 'T1', 4, 'LIBRE'),
(2, 'T2', 2, 'LIBRE'),
(3, 'T3', 6, 'OCCUPEE'),
(4, 'T4', 4, 'LIBRE'),
(5, 'T5', 8, 'RESERVEE'),
(6, 'T6', 2, 'LIBRE');

INSERT IGNORE INTO `bar_cashiers` (`id`, `nom`, `statut`) VALUES
(1, 'Caisse 1', 'ACTIF'),
(2, 'Caisse 2', 'ACTIF');