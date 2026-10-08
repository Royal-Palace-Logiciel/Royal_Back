  -- ============================================================
  -- Bar & Lounge Module — External SQL Script
  -- À exécuter séparément après l'import de hda.sql
  -- ============================================================

  -- --------------------------------------------------------
  -- Structure de la table `bar_clients`
  -- --------------------------------------------------------

  CREATE TABLE IF NOT EXISTS `bar_clients` (
    `id` bigint(20) UNSIGNED NOT NULL AUTO_INCREMENT,
    `nom` varchar(100) NOT NULL,
    `prenom` varchar(100) DEFAULT NULL,
    `telephone` varchar(20) DEFAULT NULL,
    `email` varchar(100) DEFAULT NULL,
    `adresse` text DEFAULT NULL,
    `statut` enum('ACTIF','INACTIF') DEFAULT 'ACTIF',
    PRIMARY KEY (`id`)
  ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

  -- --------------------------------------------------------
  -- Structure de la table `bar_tables`
  -- --------------------------------------------------------

  CREATE TABLE IF NOT EXISTS `bar_tables` (
    `id` bigint(20) UNSIGNED NOT NULL AUTO_INCREMENT,
    `numero` varchar(20) DEFAULT NULL,
    `capacite` int(11) DEFAULT NULL,
    `statut` varchar(30) DEFAULT 'LIBRE',
    PRIMARY KEY (`id`)
  ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

  -- --------------------------------------------------------
  -- Structure de la table `bar_transactions` — commandes caisse
  -- --------------------------------------------------------

  CREATE TABLE IF NOT EXISTS `bar_transactions` (
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
    KEY `bar_transactions_ibfk_1` (`session_id`),
    KEY `bar_transactions_ibfk_2` (`product_id`),
    KEY `bar_transactions_ibfk_3` (`client_id`),
    KEY `bar_transactions_ibfk_4` (`table_id`),
    CONSTRAINT `bar_transactions_ibfk_1` FOREIGN KEY (`session_id`) REFERENCES `bar_sessions` (`id`) ON DELETE SET NULL,
    CONSTRAINT `bar_transactions_ibfk_2` FOREIGN KEY (`product_id`) REFERENCES `bar_products` (`id`) ON DELETE RESTRICT,
    CONSTRAINT `bar_transactions_ibfk_3` FOREIGN KEY (`client_id`) REFERENCES `bar_clients` (`id`) ON DELETE SET NULL,
    CONSTRAINT `bar_transactions_ibfk_4` FOREIGN KEY (`table_id`) REFERENCES `bar_tables` (`id`) ON DELETE SET NULL
  ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

  -- --------------------------------------------------------
  -- Structure de la table `bar_orders`
  -- --------------------------------------------------------

  CREATE TABLE IF NOT EXISTS `bar_orders` (
    `id` bigint(20) UNSIGNED NOT NULL AUTO_INCREMENT,
    `client_name` varchar(150) DEFAULT NULL,
    `table_id` bigint(20) UNSIGNED DEFAULT NULL,
    `statut` varchar(30) DEFAULT 'EN_ATTENTE',
    `montant_total` decimal(10,2) DEFAULT 0.00,
    `created_at` datetime DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (`id`),
    KEY `idx_bar_orders_table_id` (`table_id`)
  ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

  -- --------------------------------------------------------
  -- Structure de la table `bar_order_items`
  -- --------------------------------------------------------

  CREATE TABLE IF NOT EXISTS `bar_order_items` (
    `id` bigint(20) UNSIGNED NOT NULL AUTO_INCREMENT,
    `order_id` bigint(20) UNSIGNED NOT NULL,
    `nom` varchar(150) DEFAULT NULL,
    `quantite` int(11) DEFAULT 1,
    `prix` decimal(10,2) DEFAULT 0.00,
    `created_at` datetime DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (`id`),
    KEY `idx_bar_order_items_order_id` (`order_id`),
    CONSTRAINT `fk_bar_order_items_order` FOREIGN KEY (`order_id`) REFERENCES `bar_orders` (`id`) ON DELETE CASCADE
  ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

  -- ============================================================
  -- Données de test — Bar Tables & Clients
  -- ============================================================

  INSERT IGNORE INTO `bar_clients` (`id`, `nom`, `prenom`, `telephone`, `email`, `statut`) VALUES
  (1, 'Razafy',    'Jean',    '+261 34 12 345 67', 'jean@example.com',   'ACTIF'),
  (2, 'Ramanantsoa', 'Marie', '+261 32 98 765 43', 'marie@example.com',  'ACTIF'),
  (3, 'Rakoto',    'Paul',    '+261 33 45 678 90', 'paul@example.com',   'ACTIF'),
  (4, 'Rajaonarison', 'Claire', NULL,                     NULL,                     'ACTIF');

  INSERT IGNORE INTO `bar_tables` (`id`, `numero`, `capacite`, `statut`) VALUES
  (1, 'T1', 4, 'LIBRE'),
  (2, 'T2', 2, 'LIBRE'),
  (3, 'T3', 6, 'OCCUPEE'),
  (4, 'T4', 4, 'LIBRE'),
  (5, 'T5', 8, 'RESERVEE'),
  (6, 'T6', 2, 'LIBRE');
