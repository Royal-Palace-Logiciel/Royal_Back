-- phpMyAdmin SQL Dump
-- version 5.2.1
-- https://www.phpmyadmin.net/
--
-- Hôte : 127.0.0.1
-- Généré le : jeu. 16 juil. 2026 à 15:08
-- Version du serveur : 10.4.32-MariaDB
-- Version de PHP : 8.2.12

SET SQL_MODE = "NO_AUTO_VALUE_ON_ZERO";
START TRANSACTION;
SET time_zone = "+00:00";


/*!40101 SET @OLD_CHARACTER_SET_CLIENT=@@CHARACTER_SET_CLIENT */;
/*!40101 SET @OLD_CHARACTER_SET_RESULTS=@@CHARACTER_SET_RESULTS */;
/*!40101 SET @OLD_COLLATION_CONNECTION=@@COLLATION_CONNECTION */;
/*!40101 SET NAMES utf8mb4 */;

--
-- Base de données : `hda`
--

-- --------------------------------------------------------

--
-- Structure de la table `audit_logs`
--

CREATE TABLE `audit_logs` (
  `id` bigint(20) UNSIGNED NOT NULL,
  `user_id` bigint(20) UNSIGNED DEFAULT NULL,
  `action` varchar(255) DEFAULT NULL,
  `entite` varchar(100) DEFAULT NULL,
  `entite_id` bigint(20) DEFAULT NULL,
  `payload` longtext CHARACTER SET utf8mb4 COLLATE utf8mb4_bin DEFAULT NULL CHECK (json_valid(`payload`)),
  `created_at` datetime DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Déchargement des données de la table `audit_logs`
--

INSERT INTO `audit_logs` (`id`, `user_id`, `action`, `entite`, `entite_id`, `payload`, `created_at`) VALUES
(1, 1, 'LOGIN', 'users', 1, NULL, '2026-07-03 14:51:03'),
(2, 1, 'LOGIN', 'users', 1, NULL, '2026-07-03 14:51:42'),
(3, 1, 'LOGIN', 'users', 1, NULL, '2026-07-03 14:53:27'),
(4, 1, 'LOGIN', 'users', 1, NULL, '2026-07-03 14:53:49'),
(5, 1, 'LOGIN', 'users', 1, NULL, '2026-07-03 14:55:14'),
(6, 1, 'LOGIN', 'users', 1, NULL, '2026-07-03 14:57:05'),
(7, 1, 'LOGIN', 'users', 1, NULL, '2026-07-03 14:58:10'),
(8, 1, 'LOGIN', 'users', 1, NULL, '2026-07-03 14:58:44'),
(9, 1, 'LOGIN', 'users', 1, NULL, '2026-07-06 09:33:54'),
(10, 1, 'LOGIN', 'users', 1, NULL, '2026-07-06 09:33:58'),
(11, 1, 'LOGIN', 'users', 1, NULL, '2026-07-06 09:34:03'),
(12, 1, 'LOGIN', 'users', 1, NULL, '2026-07-06 09:34:09'),
(13, 1, 'LOGIN', 'users', 1, NULL, '2026-07-06 09:34:22'),
(14, 1, 'LOGIN', 'users', 1, NULL, '2026-07-06 09:34:23'),
(15, 1, 'LOGIN', 'users', 1, NULL, '2026-07-06 09:36:31'),
(16, 1, 'LOGIN', 'users', 1, NULL, '2026-07-08 11:53:12'),
(17, 1, 'LOGIN', 'users', 1, NULL, '2026-07-09 09:40:18'),
(18, 1, 'LOGIN', 'users', 1, NULL, '2026-07-10 10:07:45'),
(19, 1, 'LOGIN', 'users', 1, NULL, '2026-07-13 09:06:56'),
(20, 1, 'LOGIN', 'users', 1, NULL, '2026-07-14 08:41:18'),
(21, 1, 'LOGIN', 'users', 1, NULL, '2026-07-15 09:24:02'),
(22, 1, 'LOGIN', 'users', 1, NULL, '2026-07-16 09:36:41');

-- --------------------------------------------------------

--
-- Structure de la table `caisse_transfers`
--

CREATE TABLE `caisse_transfers` (
  `id` bigint(20) UNSIGNED NOT NULL,
  `module_source` varchar(30) NOT NULL COMMENT 'CASINO, RESTAURANT, BAR, BOUTIQUE, HEBERGEMENT',
  `session_source_id` bigint(20) UNSIGNED NOT NULL COMMENT 'Référence polymorphe vers la session de caisse émettrice',
  `module_destination` varchar(30) NOT NULL,
  `session_destination_id` bigint(20) UNSIGNED NOT NULL COMMENT 'Référence polymorphe vers la session de caisse réceptrice',
  `montant` bigint(20) UNSIGNED NOT NULL,
  `motif` varchar(255) DEFAULT NULL,
  `statut` enum('EN_ATTENTE','CONFIRME','REFUSE','ANNULE') NOT NULL DEFAULT 'EN_ATTENTE',
  `ref_flux_global_source` varchar(64) DEFAULT NULL,
  `ref_flux_global_destination` varchar(64) DEFAULT NULL,
  `created_by` bigint(20) UNSIGNED NOT NULL,
  `confirmed_by` bigint(20) UNSIGNED DEFAULT NULL,
  `created_at` datetime DEFAULT current_timestamp(),
  `confirmed_at` datetime DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Déchargement des données de la table `caisse_transfers`
--

INSERT INTO `caisse_transfers` (`id`, `module_source`, `session_source_id`, `module_destination`, `session_destination_id`, `montant`, `motif`, `statut`, `ref_flux_global_source`, `ref_flux_global_destination`, `created_by`, `confirmed_by`, `created_at`, `confirmed_at`) VALUES
(1, 'CASINO', 4, 'CASINO', 6, 200000, 'Transférer', 'CONFIRME', '866234a4-7726-4dff-913f-21d7b0893339', '0fc25f68-ef69-4cac-b86c-4516a37f9a43', 1, 1, '2026-07-13 10:15:40', '2026-07-13 10:16:35'),
(2, 'CASINO', 4, 'CASINO', 6, 20000, 'Transfert', 'CONFIRME', 'cb8459e3-d231-45de-a2bb-662357dbbe10', '87603198-658f-4a20-a07c-7c76a297b434', 1, 1, '2026-07-13 10:16:23', '2026-07-13 10:16:35'),
(3, 'CASINO', 4, 'CASINO', 6, 20000, 'Donner moi ça', 'CONFIRME', '36ed87d4-60e8-4fb5-b0ee-3fe4e7853815', '5de05e2f-0bc4-4de0-a7fa-4718ab6632cd', 1, 1, '2026-07-13 10:18:32', '2026-07-13 10:48:52'),
(4, 'CASINO', 4, 'CASINO', 6, 30000, 'Donner', 'CONFIRME', '64a480ee-253b-40de-9908-c867431ecac1', '975e2545-f218-4897-899d-4f59a37a592f', 1, 1, '2026-07-13 10:18:56', '2026-07-13 10:48:51'),
(5, 'CASINO', 4, 'CASINO', 6, 60000, 'Donner moi ca', 'CONFIRME', '68869d02-c6c3-4b44-83e6-210f6e30c210', 'a8a30087-8b38-4836-9be5-5119632270c7', 1, 1, '2026-07-13 10:49:49', '2026-07-13 10:50:20'),
(6, 'CASINO', 4, 'CASINO', 6, 10000, 'b | refus: Remplacé par le transfert #7', 'REFUSE', NULL, NULL, 1, NULL, '2026-07-13 14:58:10', NULL),
(7, 'CASINO', 6, 'CASINO', 4, 10000, 'b', 'CONFIRME', '54413aa6-edaf-4214-8560-cee6a789379b', '0233d161-dbfe-465d-bd0d-ced45990a94a', 1, 1, '2026-07-13 14:58:27', '2026-07-13 14:58:30'),
(8, 'CASINO', 4, 'CASINO', 6, 150000, ' | refus: Remplacé par le transfert #9', 'REFUSE', NULL, NULL, 1, NULL, '2026-07-13 15:02:44', NULL),
(9, 'CASINO', 6, 'CASINO', 4, 150000, ' | refus: Remplacé par le transfert #10', 'REFUSE', NULL, NULL, 1, NULL, '2026-07-13 15:03:16', NULL),
(10, 'CASINO', 4, 'CASINO', 6, 150000, ' | refus: Remplacé par le transfert #11', 'REFUSE', NULL, NULL, 1, NULL, '2026-07-13 15:03:35', NULL),
(11, 'CASINO', 6, 'CASINO', 4, 150000, ' | refus: Remplacé par le transfert #12', 'REFUSE', NULL, NULL, 1, NULL, '2026-07-13 15:04:12', NULL),
(12, 'CASINO', 4, 'CASINO', 6, 150000, ' | refus: Remplacé par le transfert #13', 'REFUSE', NULL, NULL, 1, NULL, '2026-07-13 15:06:53', NULL),
(13, 'CASINO', 4, 'CASINO', 6, 150000, ' | refus: Remplacé par le transfert #14', 'REFUSE', NULL, NULL, 1, NULL, '2026-07-13 15:07:20', NULL),
(14, 'CASINO', 4, 'CASINO', 6, 150000, NULL, 'CONFIRME', '224ab360-8dbf-4688-b8d3-06939ed69c3d', '42ac5cbc-2918-4fc3-a63a-5005e79d7cab', 1, 1, '2026-07-13 15:07:32', '2026-07-13 15:07:45'),
(15, 'CASINO', 4, 'CASINO', 6, 121741000, NULL, 'CONFIRME', '046cea3c-23f5-4402-8c74-94d91526cf70', 'e5ab4b03-4986-4856-9cb0-1cd87828b450', 1, 1, '2026-07-13 15:10:47', '2026-07-13 15:10:53'),
(16, 'CASINO', 4, 'CASINO', 6, 20, NULL, 'CONFIRME', 'cd8db8ad-d260-490d-a8eb-4b337e152d00', '458e94e5-66b6-4c85-956c-89a9828a9ddd', 1, 1, '2026-07-13 15:17:51', '2026-07-13 15:18:34'),
(17, 'CASINO', 6, 'CASINO', 4, 130000000, ' | refus: Remplacé par le transfert #18', 'REFUSE', NULL, NULL, 1, NULL, '2026-07-13 15:18:27', NULL),
(18, 'CASINO', 6, 'CASINO', 4, 130000000, ' | refus: Remplacé par le transfert #19', 'REFUSE', NULL, NULL, 1, NULL, '2026-07-13 15:18:37', NULL),
(19, 'CASINO', 6, 'CASINO', 4, 130000000, ' | refus: Remplacé par le transfert #20', 'REFUSE', NULL, NULL, 1, NULL, '2026-07-13 15:18:42', NULL),
(20, 'CASINO', 4, 'CASINO', 6, 130000000, ' | refus: Remplacé par le transfert #21', 'REFUSE', NULL, NULL, 1, NULL, '2026-07-13 15:19:06', NULL),
(21, 'CASINO', 4, 'CASINO', 6, 130000000, ' | refus: Remplacé par le transfert #22', 'REFUSE', NULL, NULL, 1, NULL, '2026-07-13 15:19:16', NULL),
(22, 'CASINO', 6, 'CASINO', 4, 130000000, NULL, 'CONFIRME', '1b14dcb4-cb9f-4d1d-8339-7f2f2f4f4a43', 'daf0e45e-278a-4f42-9e8b-232d29c264f8', 1, 1, '2026-07-13 15:19:18', '2026-07-13 15:19:29'),
(23, 'CASINO', 4, 'CASINO', 6, 19999980, NULL, 'CONFIRME', '1cccdfc6-2599-4106-8fe3-05a0395fd97c', 'c2f47e43-8f63-42f1-8c6c-e3f4c32ce2b6', 1, 1, '2026-07-13 15:20:05', '2026-07-13 15:20:17');

-- --------------------------------------------------------

--
-- Structure de la table `casino_cards`
--

CREATE TABLE `casino_cards` (
  `id` bigint(20) UNSIGNED NOT NULL,
  `client_id` bigint(20) UNSIGNED NOT NULL,
  `numero_carte` varchar(100) NOT NULL,
  `qr_code` varchar(150) NOT NULL COMMENT 'Valeur encodée dans le QR, scannée en caisse',
  `niveau` enum('STANDARD','SILVER','GOLD','VIP') NOT NULL DEFAULT 'STANDARD',
  `points` bigint(20) NOT NULL DEFAULT 0,
  `plafond_credit` bigint(20) UNSIGNED DEFAULT NULL COMMENT 'Surcharge du plafond par défaut (direction)',
  `statut` enum('ACTIVE','SUSPENDUE','PERDUE') NOT NULL DEFAULT 'ACTIVE',
  `date_emission` date DEFAULT NULL,
  `created_at` datetime DEFAULT current_timestamp(),
  `updated_at` datetime DEFAULT current_timestamp() ON UPDATE current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Déchargement des données de la table `casino_cards`
--

INSERT INTO `casino_cards` (`id`, `client_id`, `numero_carte`, `qr_code`, `niveau`, `points`, `plafond_credit`, `statut`, `date_emission`, `created_at`, `updated_at`) VALUES
(1, 1, 'CARD-001', 'QR-CARD-001', 'STANDARD', 0, 1000000, 'ACTIVE', '2026-07-07', '2026-07-07 11:24:15', '2026-07-07 11:24:15');

-- --------------------------------------------------------

--
-- Structure de la table `casino_cashiers`
--

CREATE TABLE `casino_cashiers` (
  `id` bigint(20) UNSIGNED NOT NULL,
  `room_id` bigint(20) UNSIGNED NOT NULL,
  `code` varchar(30) NOT NULL,
  `nom` varchar(100) NOT NULL,
  `statut` enum('OUVERTE','FERMEE','MAINTENANCE') NOT NULL DEFAULT 'FERMEE',
  `created_at` datetime DEFAULT current_timestamp(),
  `updated_at` datetime DEFAULT current_timestamp() ON UPDATE current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Déchargement des données de la table `casino_cashiers`
--

INSERT INTO `casino_cashiers` (`id`, `room_id`, `code`, `nom`, `statut`, `created_at`, `updated_at`) VALUES
(1, 1, 'CAISSE-01', 'Caisse N-01', 'OUVERTE', '2026-07-07 11:18:30', '2026-07-16 10:08:14'),
(2, 1, 'CAISSE-02', 'Caisse N-02', 'OUVERTE', '2026-07-07 11:19:07', '2026-07-16 10:08:18'),
(3, 2, 'C3', 'Caisse pour VIP 2', 'OUVERTE', '2026-07-08 15:38:14', '2026-07-08 15:47:28'),
(4, 2, 'C4', 'Caisse Pour VIP 2', 'OUVERTE', '2026-07-08 16:25:28', '2026-07-08 16:25:28');

-- --------------------------------------------------------

--
-- Structure de la table `casino_cashier_sessions`
--

CREATE TABLE `casino_cashier_sessions` (
  `id` bigint(20) UNSIGNED NOT NULL,
  `cashier_id` bigint(20) UNSIGNED NOT NULL,
  `user_id` bigint(20) UNSIGNED NOT NULL COMMENT 'Caissier connecté',
  `ouverture_at` datetime NOT NULL,
  `fermeture_at` datetime DEFAULT NULL,
  `fond_initial` bigint(20) UNSIGNED NOT NULL DEFAULT 0,
  `fond_final_declare` bigint(20) UNSIGNED DEFAULT NULL COMMENT 'Comptage physique à la fermeture',
  `fond_final_theorique` bigint(20) DEFAULT NULL COMMENT 'fond_initial + entrées - sorties',
  `ecart` bigint(20) DEFAULT NULL COMMENT 'déclaré - théorique',
  `statut` enum('OUVERTE','FERMEE') NOT NULL DEFAULT 'OUVERTE',
  `commentaire` text DEFAULT NULL,
  `created_at` datetime DEFAULT current_timestamp(),
  `cashier_id_if_open` bigint(20) UNSIGNED GENERATED ALWAYS AS (if(`statut` = 'OUVERTE',`cashier_id`,NULL)) VIRTUAL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Déchargement des données de la table `casino_cashier_sessions`
--

INSERT INTO `casino_cashier_sessions` (`id`, `cashier_id`, `user_id`, `ouverture_at`, `fermeture_at`, `fond_initial`, `fond_final_declare`, `fond_final_theorique`, `ecart`, `statut`, `commentaire`, `created_at`) VALUES
(1, 1, 1, '2026-07-07 11:20:03', '2026-07-08 16:01:17', 10000, 20000, 20000, 0, 'FERMEE', 'Gain', '2026-07-07 11:20:03'),
(2, 2, 1, '2026-07-07 11:49:36', '2026-07-08 16:22:53', 1000, 2, -189869000, 189869002, 'FERMEE', 'Gain', '2026-07-07 11:49:36'),
(3, 3, 1, '2026-07-08 15:39:22', '2026-07-08 15:40:45', 10000, 60000, 60000, 0, 'FERMEE', 'Gain', '2026-07-08 15:39:22'),
(4, 3, 1, '2026-07-08 15:47:28', NULL, 1000, NULL, NULL, NULL, 'OUVERTE', NULL, '2026-07-08 15:47:28'),
(5, 1, 1, '2026-07-08 16:16:02', '2026-07-08 16:33:10', 20000, 81000, -81000, 162000, 'FERMEE', 'Gain', '2026-07-08 16:16:02'),
(6, 2, 1, '2026-07-08 16:23:01', '2026-07-16 10:03:13', 200000, 13408000, 13408000, 0, 'FERMEE', 'Fin', '2026-07-08 16:23:01'),
(7, 1, 1, '2026-07-16 10:08:14', NULL, 10000, NULL, NULL, NULL, 'OUVERTE', NULL, '2026-07-16 10:08:14'),
(8, 2, 1, '2026-07-16 10:08:18', NULL, 10000, NULL, NULL, NULL, 'OUVERTE', NULL, '2026-07-16 10:08:18');

-- --------------------------------------------------------

--
-- Structure de la table `casino_cash_operations`
--

CREATE TABLE `casino_cash_operations` (
  `id` bigint(20) UNSIGNED NOT NULL,
  `cashier_session_id` bigint(20) UNSIGNED NOT NULL,
  `client_id` bigint(20) UNSIGNED DEFAULT NULL COMMENT 'NULL si aucune carte/aucun client sélectionné',
  `client_libre` varchar(150) DEFAULT NULL COMMENT 'Nom libre si client non enregistré',
  `type_operation` enum('BUY_IN','CASH_OUT','AVANCE_CREDIT','REMBOURSEMENT_CREDIT','DEPOT','TRANSFERT_ENTRANT','TRANSFERT_SORTANT','PROLONGATION','AUTRE') NOT NULL,
  `montant` bigint(20) UNSIGNED NOT NULL,
  `moyen_paiement` enum('ESPECES','CARTE','MOBILE_MONEY','VIREMENT') NOT NULL DEFAULT 'ESPECES',
  `credit_id` bigint(20) UNSIGNED DEFAULT NULL COMMENT 'Référence si AVANCE_CREDIT / REMBOURSEMENT_CREDIT',
  `transfer_id` bigint(20) UNSIGNED DEFAULT NULL COMMENT 'Référence vers caisse_transfers si type TRANSFERT_*',
  `ref_flux_global` varchar(64) DEFAULT NULL COMMENT 'Référence de liaison vers financial_transactions',
  `created_by` bigint(20) UNSIGNED NOT NULL COMMENT 'Caissier connecté',
  `created_at` datetime DEFAULT current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Déchargement des données de la table `casino_cash_operations`
--

INSERT INTO `casino_cash_operations` (`id`, `cashier_session_id`, `client_id`, `client_libre`, `type_operation`, `montant`, `moyen_paiement`, `credit_id`, `transfer_id`, `ref_flux_global`, `created_by`, `created_at`) VALUES
(1, 1, 1, NULL, 'BUY_IN', 10000, 'ESPECES', NULL, NULL, '832f139e-07d2-4c7e-aee3-7a0c50fe96c0', 1, '2026-07-07 11:20:58'),
(2, 1, 1, NULL, 'BUY_IN', 10000, 'ESPECES', NULL, NULL, '194efdde-5228-475f-8e6b-3eaa1e848cd2', 1, '2026-07-07 11:21:18'),
(3, 1, 1, NULL, 'CASH_OUT', 10000, 'ESPECES', NULL, NULL, '48140274-7e39-4924-83b6-714b846b19b2', 1, '2026-07-07 11:50:02'),
(4, 4, NULL, NULL, 'TRANSFERT_SORTANT', 20000, 'ESPECES', NULL, 2, 'cb8459e3-d231-45de-a2bb-662357dbbe10', 1, '2026-07-13 10:16:35'),
(5, 6, NULL, NULL, 'TRANSFERT_ENTRANT', 20000, 'ESPECES', NULL, 2, '87603198-658f-4a20-a07c-7c76a297b434', 1, '2026-07-13 10:16:35'),
(6, 4, NULL, NULL, 'TRANSFERT_SORTANT', 200000, 'ESPECES', NULL, 1, '866234a4-7726-4dff-913f-21d7b0893339', 1, '2026-07-13 10:16:35'),
(7, 6, NULL, NULL, 'TRANSFERT_ENTRANT', 200000, 'ESPECES', NULL, 1, '0fc25f68-ef69-4cac-b86c-4516a37f9a43', 1, '2026-07-13 10:16:35'),
(8, 4, NULL, NULL, 'TRANSFERT_SORTANT', 30000, 'ESPECES', NULL, 4, '64a480ee-253b-40de-9908-c867431ecac1', 1, '2026-07-13 10:48:51'),
(9, 6, NULL, NULL, 'TRANSFERT_ENTRANT', 30000, 'ESPECES', NULL, 4, '975e2545-f218-4897-899d-4f59a37a592f', 1, '2026-07-13 10:48:51'),
(10, 4, NULL, NULL, 'TRANSFERT_SORTANT', 20000, 'ESPECES', NULL, 3, '36ed87d4-60e8-4fb5-b0ee-3fe4e7853815', 1, '2026-07-13 10:48:52'),
(11, 6, NULL, NULL, 'TRANSFERT_ENTRANT', 20000, 'ESPECES', NULL, 3, '5de05e2f-0bc4-4de0-a7fa-4718ab6632cd', 1, '2026-07-13 10:48:52'),
(12, 4, NULL, NULL, 'TRANSFERT_SORTANT', 60000, 'ESPECES', NULL, 5, '68869d02-c6c3-4b44-83e6-210f6e30c210', 1, '2026-07-13 10:50:20'),
(13, 6, NULL, NULL, 'TRANSFERT_ENTRANT', 60000, 'ESPECES', NULL, 5, 'a8a30087-8b38-4836-9be5-5119632270c7', 1, '2026-07-13 10:50:20'),
(14, 6, NULL, NULL, 'TRANSFERT_SORTANT', 10000, 'ESPECES', NULL, 7, '54413aa6-edaf-4214-8560-cee6a789379b', 1, '2026-07-13 14:58:30'),
(15, 4, NULL, NULL, 'TRANSFERT_ENTRANT', 10000, 'ESPECES', NULL, 7, '0233d161-dbfe-465d-bd0d-ced45990a94a', 1, '2026-07-13 14:58:30'),
(16, 4, NULL, NULL, 'TRANSFERT_SORTANT', 150000, 'ESPECES', NULL, 14, '224ab360-8dbf-4688-b8d3-06939ed69c3d', 1, '2026-07-13 15:07:45'),
(17, 6, NULL, NULL, 'TRANSFERT_ENTRANT', 150000, 'ESPECES', NULL, 14, '42ac5cbc-2918-4fc3-a63a-5005e79d7cab', 1, '2026-07-13 15:07:45'),
(18, 4, NULL, NULL, 'TRANSFERT_SORTANT', 121741000, 'ESPECES', NULL, 15, '046cea3c-23f5-4402-8c74-94d91526cf70', 1, '2026-07-13 15:10:53'),
(19, 6, NULL, NULL, 'TRANSFERT_ENTRANT', 121741000, 'ESPECES', NULL, 15, 'e5ab4b03-4986-4856-9cb0-1cd87828b450', 1, '2026-07-13 15:10:53'),
(20, 4, NULL, NULL, 'TRANSFERT_SORTANT', 20, 'ESPECES', NULL, 16, 'cd8db8ad-d260-490d-a8eb-4b337e152d00', 1, '2026-07-13 15:18:34'),
(21, 6, NULL, NULL, 'TRANSFERT_ENTRANT', 20, 'ESPECES', NULL, 16, '458e94e5-66b6-4c85-956c-89a9828a9ddd', 1, '2026-07-13 15:18:34'),
(22, 6, NULL, NULL, 'TRANSFERT_SORTANT', 130000000, 'ESPECES', NULL, 22, '1b14dcb4-cb9f-4d1d-8339-7f2f2f4f4a43', 1, '2026-07-13 15:19:29'),
(23, 4, NULL, NULL, 'TRANSFERT_ENTRANT', 130000000, 'ESPECES', NULL, 22, 'daf0e45e-278a-4f42-9e8b-232d29c264f8', 1, '2026-07-13 15:19:29'),
(24, 4, NULL, NULL, 'TRANSFERT_SORTANT', 19999980, 'ESPECES', NULL, 23, '1cccdfc6-2599-4106-8fe3-05a0395fd97c', 1, '2026-07-13 15:20:17'),
(25, 6, NULL, NULL, 'TRANSFERT_ENTRANT', 19999980, 'ESPECES', NULL, 23, 'c2f47e43-8f63-42f1-8c6c-e3f4c32ce2b6', 1, '2026-07-13 15:20:17'),
(26, 6, 1, NULL, 'BUY_IN', 200000, 'ESPECES', NULL, NULL, 'dbe2c37e-1d38-4936-b11a-c00294cd5aef', 1, '2026-07-16 10:00:49'),
(27, 6, 1, NULL, 'BUY_IN', 300000, 'ESPECES', NULL, NULL, '70c87b5a-ff94-431d-b173-c137c6f6305b', 1, '2026-07-16 10:01:43'),
(28, 6, 7, NULL, 'BUY_IN', 200000, 'ESPECES', NULL, NULL, '19da761e-f83a-4702-a26f-f81092381703', 1, '2026-07-16 10:02:10'),
(29, 6, 2, NULL, 'BUY_IN', 200000, 'CARTE', NULL, NULL, '14533d3d-26e3-4420-b8d4-eeeee91967a1', 1, '2026-07-16 10:02:38'),
(30, 8, 1, NULL, 'PROLONGATION', 0, 'ESPECES', NULL, NULL, 'c5c5afdb-a1ed-4f74-9891-1ee242bd11fd', 1, '2026-07-16 14:18:20');

-- --------------------------------------------------------

--
-- Structure de la table `casino_chip_transactions`
--

CREATE TABLE `casino_chip_transactions` (
  `id` bigint(20) UNSIGNED NOT NULL,
  `chip_type_id` bigint(20) UNSIGNED NOT NULL,
  `cashier_session_id` bigint(20) UNSIGNED DEFAULT NULL COMMENT 'NULL pour un paiement en jetons (type PAIEMENT), non rattaché à une session de caisse casino',
  `client_id` bigint(20) UNSIGNED DEFAULT NULL,
  `client_libre` varchar(150) DEFAULT NULL,
  `type_operation` enum('ACHAT','REPRISE','PAIEMENT') NOT NULL COMMENT 'ACHAT = client prend des jetons, REPRISE = client rend des jetons, PAIEMENT = paiement en jetons dans un autre département',
  `module_cible` enum('RESTAURANT','BAR','BOUTIQUE','HEBERGEMENT') DEFAULT NULL COMMENT 'Renseigné uniquement pour type_operation = PAIEMENT',
  `reference_commande_id` bigint(20) UNSIGNED DEFAULT NULL COMMENT 'Référence de la commande du module cible, optionnelle',
  `quantite` int(11) UNSIGNED NOT NULL,
  `valeur_unitaire` bigint(20) UNSIGNED NOT NULL COMMENT 'Copie du prix du jeton au moment T',
  `montant_total` bigint(20) UNSIGNED GENERATED ALWAYS AS (`quantite` * `valeur_unitaire`) STORED,
  `moyen_paiement` enum('ESPECES','CARTE','MOBILE_MONEY','VIREMENT','JETONS') NOT NULL DEFAULT 'ESPECES',
  `ref_flux_global` varchar(64) DEFAULT NULL,
  `created_by` bigint(20) UNSIGNED NOT NULL,
  `created_at` datetime DEFAULT current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Déchargement des données de la table `casino_chip_transactions`
--

INSERT INTO `casino_chip_transactions` (`id`, `chip_type_id`, `cashier_session_id`, `client_id`, `client_libre`, `type_operation`, `module_cible`, `reference_commande_id`, `quantite`, `valeur_unitaire`, `moyen_paiement`, `ref_flux_global`, `created_by`, `created_at`) VALUES
(1, 1, 2, 1, NULL, 'ACHAT', NULL, NULL, 1, 10000, 'ESPECES', 'a6cc8633-af67-48fc-b3e8-42ba061611a6', 1, '2026-07-07 11:57:19'),
(2, 1, 2, 1, NULL, 'ACHAT', NULL, NULL, 1, 10000, 'ESPECES', '7f98ba85-9b3e-4f3c-b0b0-20f9d33021c9', 1, '2026-07-07 11:57:27'),
(3, 1, 2, 1, NULL, 'ACHAT', NULL, NULL, 1, 10000, 'ESPECES', '2a22eb5c-a600-4b10-b3a4-291ae3f4b7b9', 1, '2026-07-07 15:38:33'),
(4, 1, 2, 1, NULL, 'ACHAT', NULL, NULL, 10, 10000, 'ESPECES', '9c5bb00f-f192-4d8c-8aa5-e6741181d7c1', 1, '2026-07-07 15:38:56'),
(5, 1, 2, 1, NULL, 'ACHAT', NULL, NULL, 1000, 10000, 'ESPECES', '6f401161-cb47-47e7-8f4c-121fb6ce30c2', 1, '2026-07-08 11:54:54'),
(6, 1, 2, 1, NULL, 'REPRISE', NULL, NULL, 20000, 10000, 'ESPECES', '4f61a4bd-3719-4541-8f9f-36dc28128cc7', 1, '2026-07-08 11:55:18'),
(7, 2, 3, NULL, NULL, 'ACHAT', NULL, NULL, 20, 1000, 'ESPECES', 'd77507b0-1434-42f4-9afc-e556d9ea48e4', 1, '2026-07-08 15:39:36'),
(8, 2, 3, 1, NULL, 'ACHAT', NULL, NULL, 30, 1000, 'ESPECES', 'ea750332-a828-4f06-a50a-1c8eddcedd29', 1, '2026-07-08 15:39:53'),
(9, 1, 4, 2, NULL, 'ACHAT', NULL, NULL, 30, 10000, 'ESPECES', '14222e98-46ca-4198-9b2d-bbc2f6a3bd90', 1, '2026-07-08 15:49:30'),
(10, 2, 4, 2, NULL, 'REPRISE', NULL, NULL, 10, 1000, 'ESPECES', '2168553f-c885-4148-b5ee-ab6825646ae4', 1, '2026-07-08 15:55:39'),
(11, 2, 5, 2, NULL, 'ACHAT', NULL, NULL, 2, 1000, 'ESPECES', 'a5670f4e-a41e-4353-9383-3844d0b180b0', 1, '2026-07-08 16:16:35'),
(12, 2, 5, 2, NULL, 'REPRISE', NULL, NULL, 3, 1000, 'ESPECES', '79a267c2-0f6a-46d3-8c14-2a5e6af15c70', 1, '2026-07-08 16:17:02'),
(13, 1, 5, 2, NULL, 'REPRISE', NULL, NULL, 10, 10000, 'ESPECES', 'a2e1edb0-dc7b-493b-a3ee-a00c65098f86', 1, '2026-07-08 16:18:06'),
(14, 2, 6, NULL, 'Bena', 'ACHAT', NULL, NULL, 100, 1000, 'ESPECES', 'f9712c65-3b09-4adf-bc0c-f360c53afbdd', 1, '2026-07-08 16:23:12'),
(15, 2, 6, NULL, 'Bena', 'REPRISE', NULL, NULL, 3, 1000, 'ESPECES', 'fffbc821-164c-4c84-95a7-1c6bb95459a9', 1, '2026-07-08 16:23:22'),
(16, 1, 4, 2, NULL, 'ACHAT', NULL, NULL, 100, 10000, 'ESPECES', 'ebd9ab0d-b1d2-44e8-9ccc-a405064876b2', 1, '2026-07-09 10:06:28'),
(17, 2, 4, NULL, 'Riry', 'ACHAT', NULL, NULL, 20, 1000, 'ESPECES', '37ecd2f6-cdbb-43ba-9d29-f58a98087864', 1, '2026-07-09 10:21:55'),
(18, 2, 4, 1, NULL, 'ACHAT', NULL, NULL, 900, 1000, 'ESPECES', '26e14ab0-24f0-4199-91f6-91751952b6f2', 1, '2026-07-09 10:23:23');

-- --------------------------------------------------------

--
-- Structure de la table `casino_chip_types`
--

CREATE TABLE `casino_chip_types` (
  `id` bigint(20) UNSIGNED NOT NULL,
  `code` varchar(30) NOT NULL,
  `nom` varchar(100) NOT NULL,
  `valeur_nominale` bigint(20) UNSIGNED NOT NULL COMMENT 'Prix / valeur du jeton en Ariary',
  `couleur` varchar(30) DEFAULT NULL,
  `quantite_stock` int(11) NOT NULL DEFAULT 0,
  `statut` enum('ACTIF','INACTIF') NOT NULL DEFAULT 'ACTIF',
  `created_at` datetime DEFAULT current_timestamp(),
  `updated_at` datetime DEFAULT current_timestamp() ON UPDATE current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Déchargement des données de la table `casino_chip_types`
--

INSERT INTO `casino_chip_types` (`id`, `code`, `nom`, `valeur_nominale`, `couleur`, `quantite_stock`, `statut`, `created_at`, `updated_at`) VALUES
(1, 'JT-01', 'Jetons 1000', 10000, '#D97757', 1900, 'ACTIF', '2026-07-07 11:56:34', '2026-07-09 10:06:28'),
(2, 'JT-03', 'Jeton 03', 1000, '#3b82f6', 81, 'ACTIF', '2026-07-08 15:26:04', '2026-07-09 10:23:23');

-- --------------------------------------------------------

--
-- Structure de la table `casino_client_profiles`
--

CREATE TABLE `casino_client_profiles` (
  `id` bigint(20) UNSIGNED NOT NULL,
  `client_id` bigint(20) UNSIGNED NOT NULL,
  `statut_special` enum('NORMAL','VIP','A_SURVEILLER','EXCLU','AUTO_EXCLU') NOT NULL DEFAULT 'NORMAL',
  `motif` text DEFAULT NULL,
  `date_effet` date DEFAULT NULL,
  `decide_par` bigint(20) UNSIGNED DEFAULT NULL COMMENT 'user_id ayant validé la décision (toujours humaine)',
  `created_at` datetime DEFAULT current_timestamp(),
  `updated_at` datetime DEFAULT current_timestamp() ON UPDATE current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

-- --------------------------------------------------------

--
-- Structure de la table `casino_credits`
--

CREATE TABLE `casino_credits` (
  `id` bigint(20) UNSIGNED NOT NULL,
  `client_id` bigint(20) UNSIGNED NOT NULL,
  `session_id` bigint(20) UNSIGNED DEFAULT NULL COMMENT 'Session de caisse à l''origine de l''octroi',
  `montant_accorde` bigint(20) UNSIGNED NOT NULL,
  `encours` bigint(20) UNSIGNED NOT NULL,
  `date_octroi` datetime NOT NULL DEFAULT current_timestamp(),
  `echeance` date DEFAULT NULL,
  `statut` enum('ACTIF','SOLDE','EN_RETARD','LITIGE') NOT NULL DEFAULT 'ACTIF',
  `ref_flux_global` varchar(64) DEFAULT NULL,
  `created_by` bigint(20) UNSIGNED DEFAULT NULL,
  `created_at` datetime DEFAULT current_timestamp(),
  `updated_at` datetime DEFAULT current_timestamp() ON UPDATE current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

-- --------------------------------------------------------

--
-- Structure de la table `casino_credit_repayments`
--

CREATE TABLE `casino_credit_repayments` (
  `id` bigint(20) UNSIGNED NOT NULL,
  `credit_id` bigint(20) UNSIGNED NOT NULL,
  `montant` bigint(20) UNSIGNED NOT NULL,
  `date_remboursement` datetime NOT NULL DEFAULT current_timestamp(),
  `delai_jours` int(11) DEFAULT NULL COMMENT 'delta vs échéance, négatif = en avance',
  `moyen_paiement` enum('ESPECES','CARTE','MOBILE_MONEY','VIREMENT') DEFAULT NULL,
  `ref_flux_global` varchar(64) DEFAULT NULL,
  `created_by` bigint(20) UNSIGNED DEFAULT NULL,
  `created_at` datetime DEFAULT current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

-- --------------------------------------------------------

--
-- Structure de la table `casino_incidents`
--

CREATE TABLE `casino_incidents` (
  `id` bigint(20) UNSIGNED NOT NULL,
  `client_id` bigint(20) UNSIGNED NOT NULL,
  `session_id` bigint(20) UNSIGNED DEFAULT NULL,
  `type` enum('INCIDENT','LITIGE') NOT NULL,
  `gravite` enum('FAIBLE','MOYENNE','ELEVEE') NOT NULL DEFAULT 'FAIBLE',
  `description` text NOT NULL,
  `statut` enum('OUVERT','EN_COURS','RESOLU') NOT NULL DEFAULT 'OUVERT',
  `created_by` bigint(20) UNSIGNED DEFAULT NULL,
  `created_at` datetime DEFAULT current_timestamp(),
  `resolved_at` datetime DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

-- --------------------------------------------------------

--
-- Structure de la table `casino_rooms`
--

CREATE TABLE `casino_rooms` (
  `id` bigint(20) UNSIGNED NOT NULL,
  `code` varchar(30) NOT NULL,
  `nom` varchar(100) NOT NULL,
  `type_salle` enum('VIP','POKER','MACHINES','TABLE_JEUX','AUTRE') NOT NULL DEFAULT 'AUTRE',
  `statut` enum('OUVERTE','FERMEE','EN_TRAVAUX') NOT NULL DEFAULT 'OUVERTE',
  `created_at` datetime DEFAULT current_timestamp(),
  `updated_at` datetime DEFAULT current_timestamp() ON UPDATE current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Déchargement des données de la table `casino_rooms`
--

INSERT INTO `casino_rooms` (`id`, `code`, `nom`, `type_salle`, `statut`, `created_at`, `updated_at`) VALUES
(1, 'SALLES-VIP', 'salle VIP', 'VIP', 'OUVERTE', '2026-07-07 11:14:02', '2026-07-07 11:14:02'),
(2, 'SALLE-VIP-2', 'Salle VIP 2', 'VIP', 'OUVERTE', '2026-07-08 11:54:00', '2026-07-08 11:54:00');

-- --------------------------------------------------------

--
-- Structure de la table `casino_scores`
--

CREATE TABLE `casino_scores` (
  `id` bigint(20) UNSIGNED NOT NULL,
  `client_id` bigint(20) UNSIGNED NOT NULL,
  `score` decimal(5,2) NOT NULL,
  `categorie` enum('BON','MOYEN','MAUVAIS') NOT NULL,
  `facteurs` longtext CHARACTER SET utf8mb4 COLLATE utf8mb4_bin DEFAULT NULL COMMENT 'Détail des facteurs et poids ayant produit le score (traçabilité)' CHECK (json_valid(`facteurs`)),
  `calcule_le` datetime NOT NULL DEFAULT current_timestamp(),
  `decision` enum('AUCUNE','VALIDEE','CONTESTEE','ANNULEE') NOT NULL DEFAULT 'AUCUNE' COMMENT 'Le score seul ne bloque jamais : toute conséquence lourde exige une décision humaine',
  `decide_par` bigint(20) UNSIGNED DEFAULT NULL,
  `decide_le` datetime DEFAULT NULL,
  `commentaire_contestation` text DEFAULT NULL COMMENT 'Explication/contestation du client ou du staff'
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Déchargement des données de la table `casino_scores`
--

INSERT INTO `casino_scores` (`id`, `client_id`, `score`, `categorie`, `facteurs`, `calcule_le`, `decision`, `decide_par`, `decide_le`, `commentaire_contestation`) VALUES
(1, 1, 85.65, 'BON', '{\"ratio_remboursement\":{\"valeur\":1,\"poids\":0.4},\"retard_moyen_jours\":{\"valeur\":0,\"score\":1,\"poids\":0.25},\"encours_vs_plafond\":{\"encours\":0,\"plafond\":1000000,\"ratio\":0,\"poids\":0.2},\"anciennete_mois\":{\"valeur\":0,\"poids\":0.1},\"regularite_visites_12m\":{\"valeur\":3,\"poids\":0.05},\"seuils\":{\"seuil_bon_payeur\":75,\"seuil_moyen_payeur\":50}}', '2026-07-09 09:57:09', 'AUCUNE', NULL, NULL, NULL),
(2, 1, 85.65, 'BON', '{\"ratio_remboursement\":{\"valeur\":1,\"poids\":0.4},\"retard_moyen_jours\":{\"valeur\":0,\"score\":1,\"poids\":0.25},\"encours_vs_plafond\":{\"encours\":0,\"plafond\":1000000,\"ratio\":0,\"poids\":0.2},\"anciennete_mois\":{\"valeur\":0,\"poids\":0.1},\"regularite_visites_12m\":{\"valeur\":3,\"poids\":0.05},\"seuils\":{\"seuil_bon_payeur\":75,\"seuil_moyen_payeur\":50}}', '2026-07-09 09:57:59', 'AUCUNE', NULL, NULL, NULL),
(3, 2, 85.00, 'BON', '{\"ratio_remboursement\":{\"valeur\":1,\"poids\":0.4},\"retard_moyen_jours\":{\"valeur\":0,\"score\":1,\"poids\":0.25},\"encours_vs_plafond\":{\"encours\":0,\"plafond\":500000,\"ratio\":0,\"poids\":0.2},\"anciennete_mois\":{\"valeur\":0,\"poids\":0.1},\"regularite_visites_12m\":{\"valeur\":0,\"poids\":0.05},\"seuils\":{\"seuil_bon_payeur\":75,\"seuil_moyen_payeur\":50}}', '2026-07-09 09:58:13', 'AUCUNE', NULL, NULL, NULL),
(4, 1, 85.65, 'BON', '{\"ratio_remboursement\":{\"valeur\":1,\"poids\":0.4},\"retard_moyen_jours\":{\"valeur\":0,\"score\":1,\"poids\":0.25},\"encours_vs_plafond\":{\"encours\":0,\"plafond\":1000000,\"ratio\":0,\"poids\":0.2},\"anciennete_mois\":{\"valeur\":0,\"poids\":0.1},\"regularite_visites_12m\":{\"valeur\":3,\"poids\":0.05},\"seuils\":{\"seuil_bon_payeur\":75,\"seuil_moyen_payeur\":50}}', '2026-07-09 09:58:28', 'AUCUNE', NULL, NULL, NULL);

-- --------------------------------------------------------

--
-- Structure de la table `casino_scoring_config`
--

CREATE TABLE `casino_scoring_config` (
  `id` bigint(20) UNSIGNED NOT NULL,
  `cle` varchar(80) NOT NULL COMMENT 'ex: plafond_credit_defaut, poids_ratio_remboursement, seuil_bon_payeur',
  `valeur` varchar(255) NOT NULL,
  `description` varchar(255) DEFAULT NULL,
  `updated_by` bigint(20) UNSIGNED DEFAULT NULL,
  `updated_at` datetime DEFAULT current_timestamp() ON UPDATE current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Déchargement des données de la table `casino_scoring_config`
--

INSERT INTO `casino_scoring_config` (`id`, `cle`, `valeur`, `description`, `updated_by`, `updated_at`) VALUES
(1, 'plafond_credit_defaut', '500000', 'Plafond de crédit par défaut (Ariary), surchargeable par carte', NULL, '2026-07-07 11:11:18'),
(2, 'poids_ratio_remboursement', '0.40', 'Poids du ratio (montants remboursés / accordés)', NULL, '2026-07-07 11:11:18'),
(3, 'poids_retard_moyen', '0.25', 'Poids du retard moyen de remboursement (jours)', NULL, '2026-07-07 11:11:18'),
(4, 'poids_encours_vs_plafond', '0.20', 'Poids du taux d\'utilisation du plafond', NULL, '2026-07-07 11:11:18'),
(5, 'poids_anciennete', '0.10', 'Poids de l\'ancienneté du client (mois)', NULL, '2026-07-07 11:11:18'),
(6, 'poids_regularite', '0.05', 'Poids de la régularité des visites/opérations', NULL, '2026-07-07 11:11:18'),
(7, 'seuil_bon_payeur', '75', 'Score >= seuil => catégorie BON', NULL, '2026-07-07 11:11:18'),
(8, 'seuil_moyen_payeur', '50', 'Score >= seuil (et < seuil_bon_payeur) => catégorie MOYEN, sinon MAUVAIS', NULL, '2026-07-07 11:11:18');

-- --------------------------------------------------------

--
-- Structure de la table `casino_tables_jeu`
--

CREATE TABLE `casino_tables_jeu` (
  `id` bigint(20) UNSIGNED NOT NULL,
  `room_id` bigint(20) UNSIGNED NOT NULL,
  `numero` varchar(50) NOT NULL,
  `type_jeu` enum('POKER','BLACKJACK','ROULETTE','BACCARA','AUTRE') NOT NULL DEFAULT 'AUTRE',
  `cave_minimum` bigint(20) UNSIGNED NOT NULL,
  `salaire_horaire_croupier` bigint(20) UNSIGNED NOT NULL DEFAULT 0 COMMENT 'Ariary/heure, à charge du joueur lors d''une prolongation',
  `duree_prolongation_minutes` int(11) UNSIGNED NOT NULL DEFAULT 60 COMMENT 'Durée d''une période avant que le bouton Prolongation ne redevienne actif',
  `derniere_prolongation_at` datetime DEFAULT NULL COMMENT 'NULL tant qu''aucune prolongation n''a été faite : référence = created_at',
  `statut` enum('OUVERTE','FERMEE','ARCHIVEE') NOT NULL DEFAULT 'FERMEE',
  `created_at` datetime DEFAULT current_timestamp(),
  `updated_at` datetime DEFAULT current_timestamp() ON UPDATE current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Déchargement des données de la table `casino_tables_jeu`
--

INSERT INTO `casino_tables_jeu` (`id`, `room_id`, `numero`, `type_jeu`, `cave_minimum`, `salaire_horaire_croupier`, `duree_prolongation_minutes`, `derniere_prolongation_at`, `statut`, `created_at`, `updated_at`) VALUES
(2, 1, 'T-1', 'POKER', 200000, 0, 60, '2026-07-16 14:18:20', 'ARCHIVEE', '2026-07-16 09:58:22', '2026-07-16 14:52:57');

-- --------------------------------------------------------

--
-- Structure de la table `casino_table_caves`
--

CREATE TABLE `casino_table_caves` (
  `id` bigint(20) UNSIGNED NOT NULL,
  `table_jeu_id` bigint(20) UNSIGNED NOT NULL,
  `cashier_session_id` bigint(20) UNSIGNED NOT NULL COMMENT 'Session de caisse qui encaisse le mouvement',
  `client_id` bigint(20) UNSIGNED DEFAULT NULL,
  `client_libre` varchar(150) DEFAULT NULL,
  `numero_adherent` varchar(50) DEFAULT NULL,
  `date_jeu` date NOT NULL,
  `heure_arrivee` time NOT NULL,
  `heure_mouvement` datetime NOT NULL DEFAULT current_timestamp(),
  `numero_cave` int(11) NOT NULL,
  `montant_cave` bigint(20) UNSIGNED NOT NULL,
  `montant_total_joueur` bigint(20) UNSIGNED NOT NULL,
  `montant_jetons_remis` bigint(20) UNSIGNED NOT NULL,
  `statut_paiement` enum('PAYE','NON_PAYE') NOT NULL DEFAULT 'PAYE',
  `moyen_paiement` enum('ESPECES','CARTE','MOBILE_MONEY','VIREMENT') DEFAULT NULL,
  `cash_operation_id` bigint(20) UNSIGNED DEFAULT NULL,
  `created_by` bigint(20) UNSIGNED NOT NULL COMMENT 'Caissier connecté',
  `created_at` datetime DEFAULT current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Déchargement des données de la table `casino_table_caves`
--

INSERT INTO `casino_table_caves` (`id`, `table_jeu_id`, `cashier_session_id`, `client_id`, `client_libre`, `numero_adherent`, `date_jeu`, `heure_arrivee`, `heure_mouvement`, `numero_cave`, `montant_cave`, `montant_total_joueur`, `montant_jetons_remis`, `statut_paiement`, `moyen_paiement`, `cash_operation_id`, `created_by`, `created_at`) VALUES
(1, 2, 6, 1, NULL, NULL, '2026-07-16', '10:00:49', '2026-07-16 10:00:49', 1, 200000, 200000, 200000, 'PAYE', 'ESPECES', 26, 1, '2026-07-16 10:00:49'),
(2, 2, 6, 1, NULL, NULL, '2026-07-16', '10:00:49', '2026-07-16 10:01:43', 2, 300000, 500000, 300000, 'PAYE', 'ESPECES', 27, 1, '2026-07-16 10:01:43'),
(3, 2, 6, 7, NULL, NULL, '2026-07-16', '10:02:10', '2026-07-16 10:02:10', 1, 200000, 200000, 200000, 'PAYE', 'ESPECES', 28, 1, '2026-07-16 10:02:10'),
(4, 2, 6, 2, NULL, NULL, '2026-07-16', '10:02:38', '2026-07-16 10:02:38', 1, 200000, 200000, 200000, 'PAYE', 'CARTE', 29, 1, '2026-07-16 10:02:38');

-- --------------------------------------------------------

--
-- Structure de la table `casino_table_pourboires`
--

CREATE TABLE `casino_table_pourboires` (
  `id` bigint(20) UNSIGNED NOT NULL,
  `table_jeu_id` bigint(20) UNSIGNED NOT NULL,
  `cashier_session_id` bigint(20) UNSIGNED NOT NULL,
  `montant` bigint(20) UNSIGNED NOT NULL,
  `type_pourboire` enum('JETONS','ESPECES') NOT NULL,
  `created_by` bigint(20) UNSIGNED NOT NULL,
  `created_at` datetime DEFAULT current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Déchargement des données de la table `casino_table_pourboires`
--

INSERT INTO `casino_table_pourboires` (`id`, `table_jeu_id`, `cashier_session_id`, `montant`, `type_pourboire`, `created_by`, `created_at`) VALUES
(1, 2, 8, 20000, 'ESPECES', 1, '2026-07-16 14:19:51');

-- --------------------------------------------------------

--
-- Structure de la table `casino_table_prolongations`
--

CREATE TABLE `casino_table_prolongations` (
  `id` bigint(20) UNSIGNED NOT NULL,
  `table_jeu_id` bigint(20) UNSIGNED NOT NULL,
  `cashier_session_id` bigint(20) UNSIGNED NOT NULL,
  `client_id` bigint(20) UNSIGNED DEFAULT NULL,
  `client_libre` varchar(150) DEFAULT NULL,
  `montant` bigint(20) UNSIGNED NOT NULL COMMENT 'Salaire horaire croupier au moment de la prolongation (snapshot)',
  `statut_paiement` enum('PAYE','NON_PAYE') NOT NULL DEFAULT 'PAYE',
  `moyen_paiement` enum('ESPECES','CARTE','MOBILE_MONEY','VIREMENT') DEFAULT NULL,
  `cash_operation_id` bigint(20) UNSIGNED DEFAULT NULL,
  `created_by` bigint(20) UNSIGNED NOT NULL,
  `created_at` datetime DEFAULT current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Déchargement des données de la table `casino_table_prolongations`
--

INSERT INTO `casino_table_prolongations` (`id`, `table_jeu_id`, `cashier_session_id`, `client_id`, `client_libre`, `montant`, `statut_paiement`, `moyen_paiement`, `cash_operation_id`, `created_by`, `created_at`) VALUES
(1, 2, 8, 1, NULL, 0, 'PAYE', 'ESPECES', 30, 1, '2026-07-16 14:18:20');

-- --------------------------------------------------------

--
-- Structure de la table `casino_visits`
--

CREATE TABLE `casino_visits` (
  `id` bigint(20) UNSIGNED NOT NULL,
  `client_id` bigint(20) UNSIGNED NOT NULL,
  `room_id` bigint(20) UNSIGNED NOT NULL,
  `card_id` bigint(20) UNSIGNED DEFAULT NULL,
  `entree_at` datetime NOT NULL,
  `sortie_at` datetime DEFAULT NULL,
  `entree_via` enum('QR','MANUEL') NOT NULL DEFAULT 'MANUEL',
  `created_at` datetime DEFAULT current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Déchargement des données de la table `casino_visits`
--

INSERT INTO `casino_visits` (`id`, `client_id`, `room_id`, `card_id`, `entree_at`, `sortie_at`, `entree_via`, `created_at`) VALUES
(1, 1, 1, NULL, '2026-07-07 11:24:59', '2026-07-07 11:25:16', 'MANUEL', '2026-07-07 11:24:59'),
(2, 1, 1, NULL, '2026-07-07 11:25:08', '2026-07-07 11:25:17', 'MANUEL', '2026-07-07 11:25:08'),
(3, 1, 1, NULL, '2026-07-08 15:45:28', NULL, 'MANUEL', '2026-07-08 15:45:28');

-- --------------------------------------------------------

--
-- Structure de la table `categories`
--

CREATE TABLE `categories` (
  `id` bigint(20) UNSIGNED NOT NULL,
  `nom` varchar(100) DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Déchargement des données de la table `categories`
--

INSERT INTO `categories` (`id`, `nom`) VALUES
(1, 'Viandes'),
(2, 'Poissons & Fruits de mer'),
(3, 'Légumes'),
(4, 'Fruits'),
(5, 'Produits laitiers'),
(6, 'Céréales & Farines'),
(7, 'Épices & Condiments'),
(8, 'Huiles & Graisses'),
(9, 'Boissons non alcoolisées'),
(10, 'Boissons alcoolisées'),
(11, 'Desserts'),
(12, 'Produits surgelés'),
(13, 'Produits d\'entretien'),
(14, 'Consommables'),
(15, 'Plats cuisinés');

-- --------------------------------------------------------

--
-- Structure de la table `clients`
--

CREATE TABLE `clients` (
  `id` bigint(20) UNSIGNED NOT NULL,
  `code_client` varchar(50) DEFAULT NULL,
  `nom` varchar(100) NOT NULL,
  `prenom` varchar(100) DEFAULT NULL,
  `telephone` varchar(50) DEFAULT NULL,
  `email` varchar(150) DEFAULT NULL,
  `adresse` text DEFAULT NULL,
  `date_naissance` date DEFAULT NULL,
  `type_piece` varchar(50) DEFAULT NULL,
  `numero_piece` varchar(100) DEFAULT NULL,
  `photo_url` text DEFAULT NULL,
  `is_casino_player` tinyint(1) DEFAULT 0,
  `statut` varchar(30) DEFAULT 'ACTIF',
  `created_at` timestamp NULL DEFAULT NULL,
  `updated_at` timestamp NULL DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Déchargement des données de la table `clients`
--

INSERT INTO `clients` (`id`, `code_client`, `nom`, `prenom`, `telephone`, `email`, `adresse`, `date_naissance`, `type_piece`, `numero_piece`, `photo_url`, `is_casino_player`, `statut`, `created_at`, `updated_at`) VALUES
(1, '111', 'Feno', 'Mahefa', '+261 34 12 345 69', 'mahefafenosoanobel@gmail.com', 'Vatofotsy', '2026-07-11', 'CNI', '10', NULL, 1, 'ACTIF', NULL, NULL),
(2, '', 'Rako', 'Besolomaso', '0334658234', 'besolomaso@gmail.com', 'Vatofotsy', '0000-00-00', '', '', NULL, 1, 'ACTIF', '2026-07-08 12:49:26', NULL),
(7, '585444', 'Fenod', 'Mahefadd', '+261 34 12 345 64', 'mahefafenosoadnobel@gmail.com', 'Vatofotsy', '2026-07-16', 'CNI', '111111', NULL, 1, 'ACTIF', NULL, NULL);

-- --------------------------------------------------------

--
-- Structure de la table `client_accounts`
--

CREATE TABLE `client_accounts` (
  `id` bigint(20) UNSIGNED NOT NULL,
  `client_id` bigint(20) UNSIGNED NOT NULL,
  `solde` bigint(20) DEFAULT 0
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

-- --------------------------------------------------------

--
-- Structure de la table `client_kyc`
--

CREATE TABLE `client_kyc` (
  `id` bigint(20) UNSIGNED NOT NULL,
  `client_id` bigint(20) UNSIGNED NOT NULL,
  `lieu_naissance` varchar(150) DEFAULT NULL,
  `nationalite` varchar(100) DEFAULT NULL,
  `profession` varchar(150) DEFAULT NULL,
  `date_delivrance_piece` date DEFAULT NULL,
  `date_expiration_piece` date DEFAULT NULL,
  `autorite_delivrance` varchar(150) DEFAULT NULL,
  `source_revenus` varchar(150) DEFAULT NULL,
  `revenu_mensuel_estime` bigint(20) DEFAULT NULL,
  `mode_paiement` varchar(50) DEFAULT NULL,
  `banque` varchar(150) DEFAULT NULL,
  `doc_piece_identite` tinyint(1) NOT NULL DEFAULT 0,
  `doc_justificatif_domicile` tinyint(1) NOT NULL DEFAULT 0,
  `doc_photo_client` tinyint(1) NOT NULL DEFAULT 0,
  `doc_autre` varchar(255) DEFAULT NULL,
  `niveau_risque` enum('FAIBLE','MOYEN','ELEVE') DEFAULT NULL,
  `commentaires_risque` text DEFAULT NULL,
  `declaration_client` tinyint(1) NOT NULL DEFAULT 0,
  `agent_verificateur` bigint(20) UNSIGNED DEFAULT NULL COMMENT 'users.id_admin ayant validé la fiche',
  `date_verification` date DEFAULT NULL,
  `created_at` datetime DEFAULT current_timestamp(),
  `updated_at` datetime DEFAULT current_timestamp() ON UPDATE current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Déchargement des données de la table `client_kyc`
--

INSERT INTO `client_kyc` (`id`, `client_id`, `lieu_naissance`, `nationalite`, `profession`, `date_delivrance_piece`, `date_expiration_piece`, `autorite_delivrance`, `source_revenus`, `revenu_mensuel_estime`, `mode_paiement`, `banque`, `doc_piece_identite`, `doc_justificatif_domicile`, `doc_photo_client`, `doc_autre`, `niveau_risque`, `commentaires_risque`, `declaration_client`, `agent_verificateur`, `date_verification`, `created_at`, `updated_at`) VALUES
(1, 2, 'Antsirabe', 'Malagsy', 'Entrepreneur', '1998-07-17', '2029-10-15', 'Commune', 'Salaire', 3000000, 'Carte', 'BNI', 1, 1, 1, '', 'FAIBLE', 'Client non risqué', 1, NULL, '2026-07-17', '2026-07-15 09:18:47', '2026-07-15 09:18:47'),
(2, 7, '', '', '', '0000-00-00', '0000-00-00', '', '', NULL, '', '', 0, 0, 0, '', NULL, '', 0, NULL, '2026-07-15', '2026-07-15 15:04:32', '2026-07-15 15:04:32'),
(3, 1, '', '', '', '0000-00-00', '0000-00-00', '', '', NULL, '', '', 0, 0, 0, '', NULL, '', 0, NULL, '2026-07-15', '2026-07-15 15:05:14', '2026-07-15 15:05:14');

-- --------------------------------------------------------

--
-- Structure de la table `equipments`
--

CREATE TABLE `equipments` (
  `id` bigint(20) UNSIGNED NOT NULL,
  `code` varchar(50) DEFAULT NULL,
  `nom` varchar(100) NOT NULL,
  `categorie` varchar(50) DEFAULT NULL,
  `description` text DEFAULT NULL,
  `created_at` timestamp NULL DEFAULT NULL,
  `updated_at` timestamp NULL DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

-- --------------------------------------------------------

--
-- Structure de la table `financial_transactions`
--

CREATE TABLE `financial_transactions` (
  `id` bigint(20) UNSIGNED NOT NULL,
  `client_id` bigint(20) UNSIGNED DEFAULT NULL,
  `module` varchar(30) DEFAULT NULL,
  `type_flux` varchar(30) DEFAULT NULL,
  `montant` bigint(20) DEFAULT NULL,
  `reference_id` bigint(20) DEFAULT NULL,
  `ref_flux_global` varchar(64) DEFAULT NULL,
  `description` text DEFAULT NULL,
  `statut_sync` enum('PENDING','SYNCED','ERROR') NOT NULL DEFAULT 'PENDING',
  `synced_at` datetime DEFAULT NULL,
  `created_at` datetime DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Déchargement des données de la table `financial_transactions`
--

INSERT INTO `financial_transactions` (`id`, `client_id`, `module`, `type_flux`, `montant`, `reference_id`, `ref_flux_global`, `description`, `statut_sync`, `synced_at`, `created_at`) VALUES
(1, 1, 'CASINO', 'ENTREE_CAISSE_CASINO', 10000, 1, '832f139e-07d2-4c7e-aee3-7a0c50fe96c0', 'BUY_IN caisse casino', 'SYNCED', NULL, '2026-07-07 11:20:58'),
(2, 1, 'CASINO', 'ENTREE_CAISSE_CASINO', 10000, 2, '194efdde-5228-475f-8e6b-3eaa1e848cd2', 'BUY_IN caisse casino', 'SYNCED', NULL, '2026-07-07 11:21:18'),
(3, 1, 'CASINO', 'SORTIE_CAISSE_CASINO', 10000, 3, '48140274-7e39-4924-83b6-714b846b19b2', 'CASH_OUT caisse casino', 'SYNCED', NULL, '2026-07-07 11:50:02'),
(4, 1, 'CASINO', 'ENTREE_CAISSE_CASINO', 10000, 1, 'a6cc8633-af67-48fc-b3e8-42ba061611a6', 'ACHAT 1 jeton(s) Jetons 1000', 'SYNCED', NULL, '2026-07-07 11:57:19'),
(5, 1, 'CASINO', 'ENTREE_CAISSE_CASINO', 10000, 2, '7f98ba85-9b3e-4f3c-b0b0-20f9d33021c9', 'ACHAT 1 jeton(s) Jetons 1000', 'SYNCED', NULL, '2026-07-07 11:57:27'),
(6, 1, 'CASINO', 'ENTREE_CAISSE_CASINO', 10000, 3, '2a22eb5c-a600-4b10-b3a4-291ae3f4b7b9', 'ACHAT 1 jeton(s) Jetons 1000', 'SYNCED', NULL, '2026-07-07 15:38:33'),
(7, 1, 'CASINO', 'ENTREE_CAISSE_CASINO', 100000, 4, '9c5bb00f-f192-4d8c-8aa5-e6741181d7c1', 'ACHAT 10 jeton(s) Jetons 1000', 'SYNCED', NULL, '2026-07-07 15:38:56'),
(8, 1, 'CASINO', 'ENTREE_CAISSE_CASINO', 10000000, 5, '6f401161-cb47-47e7-8f4c-121fb6ce30c2', 'ACHAT 1000 jeton(s) Jetons 1000', 'SYNCED', NULL, '2026-07-08 11:54:54'),
(9, 1, 'CASINO', 'SORTIE_CAISSE_CASINO', 200000000, 6, '4f61a4bd-3719-4541-8f9f-36dc28128cc7', 'REPRISE 20000 jeton(s) Jetons 1000', 'SYNCED', NULL, '2026-07-08 11:55:18'),
(10, NULL, 'CASINO', 'ENTREE_CAISSE_CASINO', 20000, 7, 'd77507b0-1434-42f4-9afc-e556d9ea48e4', 'ACHAT 20 jeton(s) Jeton 03', 'SYNCED', NULL, '2026-07-08 15:39:36'),
(11, 1, 'CASINO', 'ENTREE_CAISSE_CASINO', 30000, 8, 'ea750332-a828-4f06-a50a-1c8eddcedd29', 'ACHAT 30 jeton(s) Jeton 03', 'SYNCED', NULL, '2026-07-08 15:39:53'),
(12, 2, 'CASINO', 'ENTREE_CAISSE_CASINO', 300000, 9, '14222e98-46ca-4198-9b2d-bbc2f6a3bd90', 'ACHAT 30 jeton(s) Jetons 1000', 'SYNCED', NULL, '2026-07-08 15:49:30'),
(13, 2, 'CASINO', 'SORTIE_CAISSE_CASINO', 10000, 10, '2168553f-c885-4148-b5ee-ab6825646ae4', 'REPRISE 10 jeton(s) Jeton 03', 'SYNCED', NULL, '2026-07-08 15:55:39'),
(14, 2, 'CASINO', 'ENTREE_CAISSE_CASINO', 2000, 11, 'a5670f4e-a41e-4353-9383-3844d0b180b0', 'ACHAT 2 jeton(s) Jeton 03', 'SYNCED', NULL, '2026-07-08 16:16:35'),
(15, 2, 'CASINO', 'SORTIE_CAISSE_CASINO', 3000, 12, '79a267c2-0f6a-46d3-8c14-2a5e6af15c70', 'REPRISE 3 jeton(s) Jeton 03', 'SYNCED', NULL, '2026-07-08 16:17:02'),
(16, 2, 'CASINO', 'SORTIE_CAISSE_CASINO', 100000, 13, 'a2e1edb0-dc7b-493b-a3ee-a00c65098f86', 'REPRISE 10 jeton(s) Jetons 1000', 'SYNCED', NULL, '2026-07-08 16:18:07'),
(17, NULL, 'CASINO', 'ENTREE_CAISSE_CASINO', 100000, 14, 'f9712c65-3b09-4adf-bc0c-f360c53afbdd', 'ACHAT 100 jeton(s) Jeton 03', 'SYNCED', NULL, '2026-07-08 16:23:12'),
(18, NULL, 'CASINO', 'SORTIE_CAISSE_CASINO', 3000, 15, 'fffbc821-164c-4c84-95a7-1c6bb95459a9', 'REPRISE 3 jeton(s) Jeton 03', 'SYNCED', NULL, '2026-07-08 16:23:22'),
(19, 2, 'CASINO', 'ENTREE_CAISSE_CASINO', 1000000, 16, 'ebd9ab0d-b1d2-44e8-9ccc-a405064876b2', 'ACHAT 100 jeton(s) Jetons 1000', 'SYNCED', NULL, '2026-07-09 10:06:28'),
(20, NULL, 'CASINO', 'ENTREE_CAISSE_CASINO', 20000, 17, '37ecd2f6-cdbb-43ba-9d29-f58a98087864', 'ACHAT 20 jeton(s) Jeton 03', 'SYNCED', NULL, '2026-07-09 10:21:55'),
(21, 1, 'CASINO', 'ENTREE_CAISSE_CASINO', 900000, 18, '26e14ab0-24f0-4199-91f6-91751952b6f2', 'ACHAT 900 jeton(s) Jeton 03', 'SYNCED', NULL, '2026-07-09 10:23:23'),
(22, NULL, 'CASINO', 'SORTIE_TRANSFERT_CAISSE', 20000, 2, 'cb8459e3-d231-45de-a2bb-662357dbbe10', 'Transfert vers CASINO (session #6) — Transfert', 'SYNCED', NULL, '2026-07-13 10:16:35'),
(23, NULL, 'CASINO', 'ENTREE_TRANSFERT_CAISSE', 20000, 2, '87603198-658f-4a20-a07c-7c76a297b434', 'Transfert reçu de CASINO (session #4) — Transfert', 'SYNCED', NULL, '2026-07-13 10:16:35'),
(24, NULL, 'CASINO', 'SORTIE_TRANSFERT_CAISSE', 200000, 1, '866234a4-7726-4dff-913f-21d7b0893339', 'Transfert vers CASINO (session #6) — Transférer', 'SYNCED', NULL, '2026-07-13 10:16:35'),
(25, NULL, 'CASINO', 'ENTREE_TRANSFERT_CAISSE', 200000, 1, '0fc25f68-ef69-4cac-b86c-4516a37f9a43', 'Transfert reçu de CASINO (session #4) — Transférer', 'SYNCED', NULL, '2026-07-13 10:16:35'),
(26, NULL, 'CASINO', 'SORTIE_TRANSFERT_CAISSE', 30000, 4, '64a480ee-253b-40de-9908-c867431ecac1', 'Transfert vers CASINO (session #6) — Donner', 'SYNCED', NULL, '2026-07-13 10:48:51'),
(27, NULL, 'CASINO', 'ENTREE_TRANSFERT_CAISSE', 30000, 4, '975e2545-f218-4897-899d-4f59a37a592f', 'Transfert reçu de CASINO (session #4) — Donner', 'SYNCED', NULL, '2026-07-13 10:48:51'),
(28, NULL, 'CASINO', 'SORTIE_TRANSFERT_CAISSE', 20000, 3, '36ed87d4-60e8-4fb5-b0ee-3fe4e7853815', 'Transfert vers CASINO (session #6) — Donner moi ça', 'SYNCED', NULL, '2026-07-13 10:48:52'),
(29, NULL, 'CASINO', 'ENTREE_TRANSFERT_CAISSE', 20000, 3, '5de05e2f-0bc4-4de0-a7fa-4718ab6632cd', 'Transfert reçu de CASINO (session #4) — Donner moi ça', 'SYNCED', NULL, '2026-07-13 10:48:52'),
(30, NULL, 'CASINO', 'SORTIE_TRANSFERT_CAISSE', 60000, 5, '68869d02-c6c3-4b44-83e6-210f6e30c210', 'Transfert vers CASINO (session #6) — Donner moi ca', 'SYNCED', NULL, '2026-07-13 10:50:20'),
(31, NULL, 'CASINO', 'ENTREE_TRANSFERT_CAISSE', 60000, 5, 'a8a30087-8b38-4836-9be5-5119632270c7', 'Transfert reçu de CASINO (session #4) — Donner moi ca', 'SYNCED', NULL, '2026-07-13 10:50:20'),
(32, NULL, 'CASINO', 'SORTIE_TRANSFERT_CAISSE', 10000, 7, '54413aa6-edaf-4214-8560-cee6a789379b', 'Transfert vers CASINO (session #4) — b', 'SYNCED', NULL, '2026-07-13 14:58:30'),
(33, NULL, 'CASINO', 'ENTREE_TRANSFERT_CAISSE', 10000, 7, '0233d161-dbfe-465d-bd0d-ced45990a94a', 'Transfert reçu de CASINO (session #6) — b', 'SYNCED', NULL, '2026-07-13 14:58:30'),
(34, NULL, 'CASINO', 'SORTIE_TRANSFERT_CAISSE', 150000, 14, '224ab360-8dbf-4688-b8d3-06939ed69c3d', 'Transfert vers CASINO (session #6)', 'SYNCED', NULL, '2026-07-13 15:07:45'),
(35, NULL, 'CASINO', 'ENTREE_TRANSFERT_CAISSE', 150000, 14, '42ac5cbc-2918-4fc3-a63a-5005e79d7cab', 'Transfert reçu de CASINO (session #4)', 'SYNCED', NULL, '2026-07-13 15:07:45'),
(36, NULL, 'CASINO', 'SORTIE_TRANSFERT_CAISSE', 121741000, 15, '046cea3c-23f5-4402-8c74-94d91526cf70', 'Transfert vers CASINO (session #6)', 'SYNCED', NULL, '2026-07-13 15:10:53'),
(37, NULL, 'CASINO', 'ENTREE_TRANSFERT_CAISSE', 121741000, 15, 'e5ab4b03-4986-4856-9cb0-1cd87828b450', 'Transfert reçu de CASINO (session #4)', 'SYNCED', NULL, '2026-07-13 15:10:53'),
(38, NULL, 'CASINO', 'SORTIE_TRANSFERT_CAISSE', 20, 16, 'cd8db8ad-d260-490d-a8eb-4b337e152d00', 'Transfert vers CASINO (session #6)', 'SYNCED', NULL, '2026-07-13 15:18:34'),
(39, NULL, 'CASINO', 'ENTREE_TRANSFERT_CAISSE', 20, 16, '458e94e5-66b6-4c85-956c-89a9828a9ddd', 'Transfert reçu de CASINO (session #4)', 'SYNCED', NULL, '2026-07-13 15:18:34'),
(40, NULL, 'CASINO', 'SORTIE_TRANSFERT_CAISSE', 130000000, 22, '1b14dcb4-cb9f-4d1d-8339-7f2f2f4f4a43', 'Transfert vers CASINO (session #4)', 'SYNCED', NULL, '2026-07-13 15:19:29'),
(41, NULL, 'CASINO', 'ENTREE_TRANSFERT_CAISSE', 130000000, 22, 'daf0e45e-278a-4f42-9e8b-232d29c264f8', 'Transfert reçu de CASINO (session #6)', 'SYNCED', NULL, '2026-07-13 15:19:29'),
(42, NULL, 'CASINO', 'SORTIE_TRANSFERT_CAISSE', 19999980, 23, '1cccdfc6-2599-4106-8fe3-05a0395fd97c', 'Transfert vers CASINO (session #6)', 'SYNCED', NULL, '2026-07-13 15:20:17'),
(43, NULL, 'CASINO', 'ENTREE_TRANSFERT_CAISSE', 19999980, 23, 'c2f47e43-8f63-42f1-8c6c-e3f4c32ce2b6', 'Transfert reçu de CASINO (session #4)', 'SYNCED', NULL, '2026-07-13 15:20:17'),
(44, 1, 'CASINO', 'ENTREE_CAISSE_CASINO', 200000, 26, 'dbe2c37e-1d38-4936-b11a-c00294cd5aef', 'Cave/recave table T1 (n°1)', 'SYNCED', NULL, '2026-07-16 10:00:49'),
(45, 1, 'CASINO', 'ENTREE_CAISSE_CASINO', 300000, 27, '70c87b5a-ff94-431d-b173-c137c6f6305b', 'Cave/recave table T1 (n°2)', 'SYNCED', NULL, '2026-07-16 10:01:43'),
(46, 7, 'CASINO', 'ENTREE_CAISSE_CASINO', 200000, 28, '19da761e-f83a-4702-a26f-f81092381703', 'Cave/recave table T1 (n°1)', 'SYNCED', NULL, '2026-07-16 10:02:10'),
(47, 2, 'CASINO', 'ENTREE_CAISSE_CASINO', 200000, 29, '14533d3d-26e3-4420-b8d4-eeeee91967a1', 'Cave/recave table T1 (n°1)', 'SYNCED', NULL, '2026-07-16 10:02:38'),
(48, 1, 'CASINO', 'ENTREE_CAISSE_CASINO', 0, 30, 'c5c5afdb-a1ed-4f74-9891-1ee242bd11fd', 'Prolongation table T1 (salaire croupier)', 'SYNCED', NULL, '2026-07-16 14:18:20');

-- --------------------------------------------------------

--
-- Structure de la table `housekeeping_tasks`
--

CREATE TABLE `housekeeping_tasks` (
  `id` bigint(20) UNSIGNED NOT NULL,
  `room_id` bigint(20) UNSIGNED NOT NULL,
  `assigned_user_id` bigint(20) UNSIGNED DEFAULT NULL,
  `type_tache` enum('NETTOYAGE','DESINFECTION','CHANGEMENT_DRAPS','CONTROLE') DEFAULT NULL,
  `statut` enum('A_FAIRE','EN_COURS','TERMINE') DEFAULT 'A_FAIRE',
  `commentaire` text DEFAULT NULL,
  `planned_at` datetime DEFAULT NULL,
  `completed_at` datetime DEFAULT NULL,
  `created_at` timestamp NULL DEFAULT NULL,
  `updated_at` timestamp NULL DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

-- --------------------------------------------------------

--
-- Structure de la table `invoices`
--

CREATE TABLE `invoices` (
  `id` bigint(20) UNSIGNED NOT NULL,
  `client_id` bigint(20) UNSIGNED DEFAULT NULL,
  `montant_total` bigint(20) DEFAULT NULL,
  `statut` varchar(30) DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

-- --------------------------------------------------------

--
-- Structure de la table `invoice_items`
--

CREATE TABLE `invoice_items` (
  `id` bigint(20) UNSIGNED NOT NULL,
  `invoice_id` bigint(20) UNSIGNED DEFAULT NULL,
  `description` varchar(255) DEFAULT NULL,
  `montant` bigint(20) DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

-- --------------------------------------------------------

--
-- Structure de la table `lost_and_found`
--

CREATE TABLE `lost_and_found` (
  `id` bigint(20) UNSIGNED NOT NULL,
  `room_id` bigint(20) UNSIGNED DEFAULT NULL,
  `client_id` bigint(20) UNSIGNED DEFAULT NULL,
  `objet` varchar(255) DEFAULT NULL,
  `description` text DEFAULT NULL,
  `date_trouvee` datetime DEFAULT NULL,
  `statut` enum('TROUVE','RESTITUE','DETRUIT') DEFAULT 'TROUVE',
  `date_restitution` datetime DEFAULT NULL,
  `created_at` timestamp NULL DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

-- --------------------------------------------------------

--
-- Structure de la table `loyalty_points`
--

CREATE TABLE `loyalty_points` (
  `id` bigint(20) UNSIGNED NOT NULL,
  `client_id` bigint(20) UNSIGNED DEFAULT NULL,
  `points` bigint(20) DEFAULT NULL,
  `motif` varchar(255) DEFAULT NULL,
  `created_at` datetime DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

-- --------------------------------------------------------

--
-- Structure de la table `minibar_consumptions`
--

CREATE TABLE `minibar_consumptions` (
  `id` bigint(20) UNSIGNED NOT NULL,
  `room_id` bigint(20) UNSIGNED NOT NULL,
  `client_id` bigint(20) UNSIGNED NOT NULL,
  `product_id` bigint(20) UNSIGNED NOT NULL,
  `quantite` int(11) NOT NULL,
  `prix_unitaire` bigint(20) NOT NULL,
  `montant` bigint(20) NOT NULL,
  `facturee` tinyint(1) DEFAULT 0,
  `consumed_at` datetime NOT NULL,
  `created_at` timestamp NULL DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

-- --------------------------------------------------------

--
-- Structure de la table `notifications`
--

CREATE TABLE `notifications` (
  `id` bigint(20) UNSIGNED NOT NULL,
  `titre` varchar(255) DEFAULT NULL,
  `message` text DEFAULT NULL,
  `statut` varchar(30) DEFAULT NULL,
  `created_at` datetime DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

-- --------------------------------------------------------

--
-- Structure de la table `orders`
--

CREATE TABLE `orders` (
  `id` bigint(20) UNSIGNED NOT NULL,
  `client_id` bigint(20) UNSIGNED DEFAULT NULL,
  `source_module` varchar(30) DEFAULT NULL,
  `montant_total` bigint(20) DEFAULT NULL,
  `statut` varchar(30) DEFAULT NULL,
  `created_at` datetime DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

-- --------------------------------------------------------

--
-- Structure de la table `order_items`
--

CREATE TABLE `order_items` (
  `id` bigint(20) UNSIGNED NOT NULL,
  `order_id` bigint(20) UNSIGNED DEFAULT NULL,
  `product_id` bigint(20) UNSIGNED DEFAULT NULL,
  `quantite` decimal(15,2) DEFAULT NULL,
  `prix_unitaire` bigint(20) DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

-- --------------------------------------------------------

--
-- Structure de la table `payments`
--

CREATE TABLE `payments` (
  `id` bigint(20) UNSIGNED NOT NULL,
  `client_id` bigint(20) UNSIGNED DEFAULT NULL,
  `invoice_id` bigint(20) UNSIGNED DEFAULT NULL,
  `montant` bigint(20) DEFAULT NULL,
  `moyen_paiement` varchar(30) DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

-- --------------------------------------------------------

--
-- Structure de la table `products`
--

CREATE TABLE `products` (
  `id` bigint(20) UNSIGNED NOT NULL,
  `category_id` bigint(20) UNSIGNED DEFAULT NULL,
  `code` varchar(50) DEFAULT NULL,
  `nom` varchar(150) DEFAULT NULL,
  `unite` varchar(20) DEFAULT NULL,
  `prix_achat` bigint(20) DEFAULT NULL,
  `prix_vente` bigint(20) DEFAULT NULL,
  `actif` tinyint(1) DEFAULT 1,
  `type_produit` enum('MATIERE_PREMIERE','PRODUIT_FINI','CONSOMMABLE','SERVICE') DEFAULT 'MATIERE_PREMIERE',
  `source_module` varchar(30) DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

-- --------------------------------------------------------

--
-- Structure de la table `product_types`
--

CREATE TABLE `product_types` (
  `id` bigint(20) UNSIGNED NOT NULL,
  `nom` varchar(100) NOT NULL,
  `description` text DEFAULT NULL,
  `actif` tinyint(1) NOT NULL DEFAULT 1,
  `created_at` timestamp NULL DEFAULT current_timestamp(),
  `updated_at` timestamp NULL DEFAULT current_timestamp() ON UPDATE current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Déchargement des données de la table `product_types`
--

INSERT INTO `product_types` (`id`, `nom`, `description`, `actif`, `created_at`, `updated_at`) VALUES
(1, 'MATIERE_PREMIERE', 'Produits utilisés pour préparer les recettes', 1, '2026-06-30 08:31:13', '2026-06-30 08:31:13'),
(2, 'PRODUIT_FINI', 'Produits prêts à être vendus', 1, '2026-06-30 08:31:13', '2026-06-30 08:31:13'),
(3, 'BOISSON', 'Boissons alcoolisées et non alcoolisées', 1, '2026-06-30 08:31:13', '2026-06-30 08:31:13'),
(4, 'CONSOMMABLE', 'Produits consommables non alimentaires', 1, '2026-06-30 08:31:13', '2026-06-30 08:31:13'),
(5, 'EMBALLAGE', 'Boîtes, sacs, cartons, emballages', 1, '2026-06-30 08:31:13', '2026-06-30 08:31:13'),
(6, 'SERVICE', 'Prestations de service', 1, '2026-06-30 08:31:13', '2026-06-30 08:31:13');

-- --------------------------------------------------------

--
-- Structure de la table `purchases`
--

CREATE TABLE `purchases` (
  `id` bigint(20) UNSIGNED NOT NULL,
  `supplier_id` bigint(20) UNSIGNED DEFAULT NULL,
  `montant_total` bigint(20) DEFAULT NULL,
  `statut` varchar(30) DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

-- --------------------------------------------------------

--
-- Structure de la table `purchase_items`
--

CREATE TABLE `purchase_items` (
  `id` bigint(20) UNSIGNED NOT NULL,
  `purchase_id` bigint(20) UNSIGNED DEFAULT NULL,
  `product_id` bigint(20) UNSIGNED DEFAULT NULL,
  `quantite` decimal(15,2) DEFAULT NULL,
  `prix_unitaire` bigint(20) DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

-- --------------------------------------------------------

--
-- Structure de la table `recipes`
--

CREATE TABLE `recipes` (
  `id` bigint(20) UNSIGNED NOT NULL,
  `product_id` bigint(20) UNSIGNED NOT NULL,
  `nom` varchar(255) DEFAULT NULL,
  `created_at` timestamp NULL DEFAULT NULL,
  `updated_at` timestamp NULL DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

-- --------------------------------------------------------

--
-- Structure de la table `recipe_items`
--

CREATE TABLE `recipe_items` (
  `id` bigint(20) UNSIGNED NOT NULL,
  `recipe_id` bigint(20) UNSIGNED NOT NULL,
  `ingredient_id` bigint(20) UNSIGNED NOT NULL,
  `quantite` decimal(15,3) DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

-- --------------------------------------------------------

--
-- Structure de la table `reservations`
--

CREATE TABLE `reservations` (
  `id` bigint(20) UNSIGNED NOT NULL,
  `client_id` bigint(20) UNSIGNED DEFAULT NULL,
  `room_id` bigint(20) UNSIGNED DEFAULT NULL,
  `date_arrivee` date DEFAULT NULL,
  `date_depart` date DEFAULT NULL,
  `montant_total` bigint(20) DEFAULT NULL,
  `statut` varchar(30) DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

-- --------------------------------------------------------

--
-- Structure de la table `reservation_guests`
--

CREATE TABLE `reservation_guests` (
  `id` bigint(20) UNSIGNED NOT NULL,
  `reservation_id` bigint(20) UNSIGNED NOT NULL,
  `nom` varchar(100) NOT NULL,
  `prenom` varchar(100) DEFAULT NULL,
  `date_naissance` date DEFAULT NULL,
  `type_piece` varchar(50) DEFAULT NULL,
  `numero_piece` varchar(100) DEFAULT NULL,
  `created_at` timestamp NULL DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

-- --------------------------------------------------------

--
-- Structure de la table `restaurant_cashiers`
--

CREATE TABLE `restaurant_cashiers` (
  `id` bigint(20) UNSIGNED NOT NULL,
  `nom` varchar(100) DEFAULT NULL,
  `statut` enum('OUVERTE','FERMEE') DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

-- --------------------------------------------------------

--
-- Structure de la table `restaurant_sessions`
--

CREATE TABLE `restaurant_sessions` (
  `id` bigint(20) UNSIGNED NOT NULL,
  `cashier_id` bigint(20) UNSIGNED DEFAULT NULL,
  `user_id` bigint(20) UNSIGNED DEFAULT NULL,
  `ouverture_at` datetime DEFAULT NULL,
  `fermeture_at` datetime DEFAULT NULL,
  `fond_initial` bigint(20) DEFAULT NULL,
  `fond_final` bigint(20) DEFAULT NULL,
  `ecart` bigint(20) DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

-- --------------------------------------------------------

--
-- Structure de la table `rooms`
--

CREATE TABLE `rooms` (
  `id` bigint(20) UNSIGNED NOT NULL,
  `room_type_id` bigint(20) UNSIGNED DEFAULT NULL,
  `numero` varchar(20) DEFAULT NULL,
  `capacite` int(11) DEFAULT NULL,
  `prix_nuit` bigint(20) DEFAULT NULL,
  `statut` enum('LIBRE','OCCUPEE','RESERVEE','NETTOYAGE','MAINTENANCE','HORS_SERVICE') DEFAULT 'LIBRE'
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Déchargement des données de la table `rooms`
--

INSERT INTO `rooms` (`id`, `room_type_id`, `numero`, `capacite`, `prix_nuit`, `statut`) VALUES
(1, 1, 'FA', 3, 6000, 'LIBRE');

-- --------------------------------------------------------

--
-- Structure de la table `room_equipments`
--

CREATE TABLE `room_equipments` (
  `id` bigint(20) UNSIGNED NOT NULL,
  `room_id` bigint(20) UNSIGNED NOT NULL,
  `equipment_id` bigint(20) UNSIGNED NOT NULL,
  `quantite` int(11) DEFAULT 1,
  `statut` enum('BON','EN_PANNE','REMPLACE','HORS_SERVICE') DEFAULT 'BON',
  `created_at` timestamp NULL DEFAULT NULL,
  `updated_at` timestamp NULL DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

-- --------------------------------------------------------

--
-- Structure de la table `room_maintenance`
--

CREATE TABLE `room_maintenance` (
  `id` bigint(20) UNSIGNED NOT NULL,
  `room_id` bigint(20) UNSIGNED NOT NULL,
  `equipment_id` bigint(20) UNSIGNED DEFAULT NULL,
  `type_intervention` enum('PREVENTIVE','CORRECTIVE','URGENCE') NOT NULL,
  `description` text DEFAULT NULL,
  `statut` enum('OUVERT','EN_COURS','TERMINE','ANNULE') DEFAULT 'OUVERT',
  `date_declaration` datetime NOT NULL,
  `date_resolution` datetime DEFAULT NULL,
  `cout` bigint(20) DEFAULT 0,
  `created_by` bigint(20) UNSIGNED DEFAULT NULL,
  `created_at` timestamp NULL DEFAULT NULL,
  `updated_at` timestamp NULL DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

-- --------------------------------------------------------

--
-- Structure de la table `room_minibar`
--

CREATE TABLE `room_minibar` (
  `id` bigint(20) UNSIGNED NOT NULL,
  `room_id` bigint(20) UNSIGNED NOT NULL,
  `product_id` bigint(20) UNSIGNED NOT NULL,
  `quantite` int(11) NOT NULL DEFAULT 0,
  `seuil_alerte` int(11) DEFAULT 1,
  `created_at` timestamp NULL DEFAULT NULL,
  `updated_at` timestamp NULL DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

-- --------------------------------------------------------

--
-- Structure de la table `room_status_history`
--

CREATE TABLE `room_status_history` (
  `id` bigint(20) UNSIGNED NOT NULL,
  `room_id` bigint(20) UNSIGNED NOT NULL,
  `ancien_statut` varchar(30) DEFAULT NULL,
  `nouveau_statut` varchar(30) DEFAULT NULL,
  `commentaire` text DEFAULT NULL,
  `changed_by` bigint(20) UNSIGNED DEFAULT NULL,
  `changed_at` datetime NOT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

-- --------------------------------------------------------

--
-- Structure de la table `room_types`
--

CREATE TABLE `room_types` (
  `id` bigint(20) UNSIGNED NOT NULL,
  `nom` varchar(100) DEFAULT NULL,
  `description` text DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Déchargement des données de la table `room_types`
--

INSERT INTO `room_types` (`id`, `nom`, `description`) VALUES
(1, 'Da', 'DADA');

-- --------------------------------------------------------

--
-- Structure de la table `signatures`
--

CREATE TABLE `signatures` (
  `id` bigint(20) UNSIGNED NOT NULL,
  `signable_type` varchar(50) NOT NULL COMMENT 'Ex: client_kyc, casino_cash_operation, casino_credit...',
  `signable_id` bigint(20) UNSIGNED NOT NULL,
  `client_id` bigint(20) UNSIGNED DEFAULT NULL,
  `signature_data` longtext NOT NULL COMMENT 'Image de signature encodée en base64 (data URI PNG)',
  `signed_at` datetime NOT NULL DEFAULT current_timestamp(),
  `created_at` datetime DEFAULT current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Déchargement des données de la table `signatures`
--

INSERT INTO `signatures` (`id`, `signable_type`, `signable_id`, `client_id`, `signature_data`, `signed_at`, `created_at`) VALUES
(1, 'client_kyc', 2, 2, 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAfQAAACgCAYAAAD6vp7fAAAQAElEQVR4AeydP6wkyV3Hq3r2CYHXu2/E3e3YAQJ0fm8TMiJwgEUKARISJsOSsURMSgAiJXZwSIjskEgQpASWgIiM6HZtySZA2vUZbvd82Ih7r9u/7/TUTE+/7unq7qrqqurv7NTrf9W/+tWnqutbVT3dWyh+SIAESIAESIAEjgT0cS2tFQp6WuVFb0mABEiABDwTqDzb92Xer6D78pp2SYAESIAESIAEzghQ0M9wcIMESIAESCAUgVSntkPxGZtOyoI+Nq9xxo+qRkflTJzlRa9IgAScEQgztb2edo2C7qxqTjQUpkZbOheVM5Y+M1qUBNbThkaJn041CaynXaOgN8u9uc51EiCB6QTW04ZOZ8QzScAxAStBZ2fbMXWaIwESIAESOBCgwhxATF8cEFoJOjvb0zn3nMndJLAQgcOVP5S6ZbQhMzxOAsMEqDDDjAZiHBBaCfqAKR4mARJIhsDhyh/y1zLakBken0sgsp5VZO7MpZvb+RT03EoU+WHIhgDbz2yKcmJGIutZRebORKjZnkZBz7ZombEcCLD9zKEUmYcYCeTYWaagx1jT4vZphnc5XkIzcPBUEiCBxQjM6yzH2ZZR0BerTmtMeN4ltEZizDMJkECMBOJsyyjoMdaVNfvEvJMACSgV5wBQ8RM3AQp63OVD71IgwMY3hVJKy8c4B4BpMVyhtxT0FRb6irPsJ+tsfP1wpVW/BNgR9ct3AesPBZ2FvEAxMEkSIAESCEyAHdHAwP0n91DQWcj+qTOFPAkwVyRAAiSwIIGHgr6gM0yaBNZBgNNgl8qZdC7R4bHgBBKqkBT04LWDCZLApGmw1WAjndUUdRoZHaqQEQl+hIIeEZ00qhu9JAESIAESWIrAkOAH9CtCQbenQ+kPWFOYVN4EmDsSIIHkCUQo6PZM7aXf3iZjDhFgN2qIEI+TAAmQwBIEkhb0JYAxTXajWAdGE+AJJEACAQhQ0ANAZhIkQAIkQAIk4JsABd03YdonARLwS4DWSYAE9gSmCTpvo+7h8Q8JkAAJrJYAdSC6op8m6LyNGl1B0iESIAEvBGi0jwB1oI/MYvunCfpi7jJhEghLgIOQsLyZWg8BVsQeMNN254qTgj6tPvCslRDgIGQlBb1UNm3TZUW0JWUVL0qcDnoZFHSr4mckEiCBdAg4aBnTyeyKPc2snB30MijoK74cmHUSSIqAdfvtoGVMCkyvs5kfYDm3C5iC3ibC7fQIWDf06WUtRo+HcQ/HmJQvx+23Jy9HZi0OL0Y6zeiREqCgR1owdGsEAccN/YiUVxl1GPdwjBjAxeFlHF5MKg/nJ7FzMxcpBX0uQZ5PAiRAAiTggMD0zg27AjV+CnrNgX9JgARIgATiITDKk+ldgVHJRB+Zgh59EdFBEkibAEdPaZcfvfdJwO3VQUH3WVa0TQIkoIZGT26bNAInAQsC0UQZujrGOUpBH8eLsSMn8Pid9+9chcizmo17bpu0bLAwIyQwmgAFfTQynrAkASPWT967Ka93ddjubisTrh5tNq4CbCKNJfPLtF0S4FyAS5q01UtgsQP+BZ3X0GKFm2rCEG0I9tNnt3vR3u5uDoJ9Uxmx3hRaa6U1gs98wv5WOgwUdp+UQ9nmXEAo0kxnGQL+BT31a0gvUzD5pXoOEqJtBBtiCdE0AaINwS60KDa+Sh9wmGW9WamqQrgvqwrhk1cvtKvw+d29mDzd/tVKa/hXp8y/JEACJLAQgQvJ+hf0C4kncSj1Dkk0kGuQRrwh2kawIZbdbopci2iXshB1rdpi/ebVywLh0x++LBC6bUzb+9mPvvfo7esXRVvYp1njWesgoNeRTeYyWgIU9GiLJi/HjJBrGek2cyZafRxlQzzPRfulhmBDWF0LdtOHS+tG2E0czCyYdS4zJaCn5qvutE49m+eRwFwCDgR9rgs5nT+5JcgJwlleuoQcI24j3BBsBAg2xPPs5Ag3CvlE6NZMl1hvzwBSl89wcCMdAhR0p2XFlsDgxI/acM9ZN0bkRsgx4jbxUlnWMwlKFVleMb7rrV60mJdNfdGsM/GVEYi+eVpZeSSfXSPkm0If21GIIUbkKQq5KZCyVAoZ0uqUL9X4YCp+idBwIeJV3x2Gy1lfNvXLvvEoCbgkEKWga5c5pK1ABLTa7m6qLiHHlHogJ4Ikg9sICNudj+ffi87n6B/1PF/f9KFexyN+NxX8w1MECOhkobMRBE4OibAByqEUV5kHT4I+74oI16MOVebzeITycl46Mg5Xp8e8MCKfJuTLsYLoQfwghgi1QNai3eyoaBmlI8zj1Xe27jzQvbcrKmJqJf90IX8Q4DueKmjmp16/qbbSCbve3ZZG+JH/Lqur2pdfA7Sq4ssts3pEhjwJOq+I8zJYB4+7O0xMn3J+vXv+R9vdbTVOJPyxMoIN8bre3ZTbHQStFuyt+AnRg/hppTXCKSftNXRe6mffux6nQ2cmZMDTAQjwBb9TQBAPBaR8266fbWvZ0kortRd/5B0BLMBH8UMCJLA4gaGruOmgJ0FvJrHe9bXlvPkr9VrEy78BA4gElr4DBBvBCDZECeJkghFsjFq10lop+aqHH4ghAoQRImnEGfsQWy6wCrMP+GU+AvaZgPRNMPt8L8EdAb7gdwoI8O+TVy8fvGgHwo+AfCF/CHW+JFcNR7XSGvwau7hKApkR0G7y48iMC2co6C4o0sYDAvg1eFmedtcCf9q2WTPCiHObIg2h2bZG19vDCBuibQRbiyh1pyMSZvHCGggjRNLYMPnps7sVn5C+CfDfnBvLEsKPgHwhfwht8Rc6e3VHPsE6Ft/phx8C2o/ZBKzuq/l8Px2Zme+IUhR0FxQXsRFnohj5wTPdEtNNoTQEDsEIdFOkIYZbEeVmMMK4KfR+Shg2TVBKq/6PSJIItvzdvxIWI1Izyq6X015YU8qnK03kCX6riz6pZD4QeIzc4bBQli/WGHIlEJEe5Yo4WL6KYCkxoVUQEM07jsshxKdMa9UW6EIrmffWer9Q+hS1c03k+SDSslZBcNB5eCjWeJ97LdgQJoxEMSIdNN+Z5vnOvZ3DLnRKDqv7fJl1+GTWuSQBEiCBkAQo6CFpT05rSOwmG+49ceqBWvRs+/wizQeRNgINQaxH0SLMryW8MuEk0hBqTBUfxdrGWVuXbGw14mCWwWzCb/hktrkkAXsC4a7xcCnZ554x3RCgoLvh6NmKJzVy4HVX49D+MRZEupnUaVR9Emkj0EYQMY39+Bffv9sv3xm/fPrs+YfNNF2tSxdkXxj4jQBsFro6INjvxq51hwONdUOYkvtw9SdcSlM48Jw5BCjoc+jx3NOD5xdYQKSlEZFvHenq0WbT92Mrmcq+w/1oMz0/dVno8ut1am7/PvxhXK1gn9+V925TUurxu1/5iQmubQ/ZK44dlaGYrePHUm7t5yYJkIB3Ao4FvW7cvHvNBKwIxFQab169kLp2au21qh+Lerq7/RNkBiPx7W7/prkNtucHrZrT4fPt1RaavxFo2q9vNdRx5v6VTk253d1WV5vi503YCpu5dm3P30raSmmFT1npU6FhBwMJtAnUVaW9l9sLEJBG1mWqvPZd0rxoy+Iiiq002qNYrbSWCvhtCAhG4kpphQ+mtXE/emrA+bCDH91h6TI0hdvYLyVBV2lg5uL8x4TGcs3GbPlaoiyM7fuyqnArxGyvfhmmCNLDHFtDY0Mw07KU9tQm94wTHYEELyKIoWjfRc9xfx0/epvDu/nGuutnz/9xji2bc+/v74+/7LeJ3xcHI3OttMZxcDIdGmwj4DiWPkI9Q3J7LBuIOW6V+EgrWZtHOsnmgI4bApmWJQXdFHDKy70EpJGBIbHGSH2ucKHjYGiIMP6OWXezbFupVDO99lHbbblX/n9mZC4+799EZ841MwDmuNnvagkxB3djDx0Jp2KeUP00DLgkgRQJUNBTLLW2zwn1Nh+KdaUwKoeImWxBuDD1u5X7xrhP/fAcE7N/aUTQTIv3x+w7YqdCpaN7zHKv/OeMJ+1Oz31Z/tQcm8LCnGuWEHBM7SNs5X55W8xNPGfLhOqnszzTEAksQMCjoNs1iAvkmUkuQAAiAvGAWDeTxyNuGOFCxCDsSlWN5l8rCDLOwbnbEQLfnAa/fnb7z2r0p+HGhXNd3GNGvkwSGB2bdbP87OPvfsGsT1mCPcQbYXsQcC1T+wgne5XqSvt0nGskQAJeCej51j0Kul2DOD8LOVgYUZIjosZCBkLSHAVKzZBv7d3TZ88/qNfUfupaBL6AsEDcSxm2i8Cbw7LUnQK//fLNV1Xrg06C2XV3f/9bZt3t8piNmWbrQr0vm52Zc5OCYp+Yef79/Oj5lhFwiDcC2OsHAg6y1f7VuOAt3PW5lWW2onBimawz1bUT2F/h8yB4FPR5jkV3tteWZkRJjogaA0MIihYxMb6Ulf67+hG2ek9Vld+s187/QpAx+oXQQHAuCbwq9b8gne1hBN8l8OfWR2zp/rj3pdVj+P0GRhypDu+v0Q2WOB3ijYBO01ZG3whGwHH8FKRLoJoC/kJjVsTcK9eniIuuJVa9F2XFxEngSOBwAVPQj0QGVpZqaQ4FNeBdlIchMsYxjD4hzG9ff/SH9b4aaCFz6vX25b9TBP6yRcujtZudkSGGc4unyagsq7vOhGRnVZ0cwX10nLcX76vNpkvARb7ljKoC8zrUb+WDz2Luwfdk/cEh7iABEghKYEKrcriAIxH0CRkICnjBxA4FtaAHp6RHFBNERx9GkxDztpDISH2fM62UfNXoT1PgMXpHKEXFugxB8CB+28MIHiPayeHd94+iCxtf6HgtrfGhkA/i9IUmo9r3quiKix8GbooTp02htVbyRUJ7iu3p83r0jRE4ooQKTGedBPQ6s+0x14eLekIKxYRzPJwyPQMenKHJPgKWxQRRgujAjGhs1RZz7G/+aA3bcwLEHeHt6xfH++8Q+Ic29f4ePAR+cthsjm+y67OhDh8w6IuD/Th+iHrRr0IrrfBVpw+4oqNUj75rAe/ifDqDayTgh4Bls+AncVo9IxCJoJ/5xI3ECUCsTBb6RokQYBMHI1Wz7mIJ2wjGFoQPASJo9qW2bPqOvIDrugQ8hRKTflcKbtLHbAlQ0FMt2kjbDtzbNUgxejTrl5a299Ev2bh0rJQPxA8iCJ/mBpNWnx1zHLMEXXGa4tx1vGsffDfnFSu7aiOt6qaYG0uOVRswuLoAgZU1DQsQ9pVkhG0HRtpa1fd2MYocynp931gpvf+qVXwev/OVz7WyZ9QFRSslX+X1g/80R8LvI+Cpgevd819uBq+Jt4yHqOqtJANtei/GQPlgMrEQoKDPKglekAbf43fevzP3hDGSxIjYHOtbVuW9k3eg99mPcf/Vo+JR7VelbBjVceu/5r9uVRZ6LkL8HxL+3QRl8Xnypds/u/7SzSfb3W0lDcO3Jfw9Ah4L1Kr6fjNInO9bmGSUiwTy7apczHbHQbakHVAm7JLrdcJZPOVAYnQzbgAAD0VJREFUgBfkAYS6enT6sRimh83+S8tPP/7eQdyUQofgUtwcjuHX6iYfeL7erNsuq0r9xCYubnvIhf1rEn7dBBHgCul3vTXv6e75X+H4plJ/qSt93UoDlRzhR7L/ByaIuH9H1vm1IsBIQwRQwYbipHhcB3ZarvfAKTK57AhADPaZktqL+7/79Y4/EG2EJ8+e/2f78Gazyb4u1r9WV8rcamgzGNr+8ccvHw/FefLe7f9rVU/pt+MifTny2ygv/C90EPLr3e3nhar+tBH3M+k4/MMnr19olKUEPDmA8K6s/4oJ//Pq5Tca53CVBEigg0Dojkr2jWgHY+5ySACjPmPu/l6kwGx0LB89KgqM5De6+qUn7914nW5v+vXZf59mAjrcCrKrmV88Xjc30S++e/Np28aT924/l27RFfbjtscnr2pRllL5N2xjvwlaV78LIddKHWdJDvG/+Ob1i98L9w484xGXUwnwPBIwBAqzwiUJjCXwREQZoz6chx/BjbknXMoH55mAl5KadRdL45f0kEXLXFicZ2NTyNhYTIgz4pKszPyKtcdffO/5fyFgxuN6d1NuipM4N297iEB/FdsQ7KrS/6QaH/HnHvsRGru5SgIkkCABCnqChRaDy0+fPf9wcxApJcO5MWIuIlI1nxNHfk4/+MLWvICOhrHQfG+82bdfytB0vwzw59yflzOvubo/APaPiurLCJjx0IdpdrC9JM5y9v+aLMv6T0XojyN0s59LEjgR4JovAtqD4ZmNiwePsjfpoxjDQyt09XWT6pQfeOFc6RSc/U9r2OcibAp1gCyS1WfwwqG+U/b7D5b365Z/rPyxtCVuy7c7ssyS3ItAF91Hj3t/bNaks/MLZj3ccgLAcM4xJRIIRqD3Qp7hwdDFP8M0T+0m4KMYu1PytRfTu8Y2Xp5i1scuq57/aW2snWb862e3/6oOev75XXmvXH9GFh9+BKgc+iNT5sp8MBJvBpklsR5t4zxjJ+xyJMCwzl1MzbYrYhvvYmIrOchsuiVAQXfLM3trmD7WSu7gSk7vy+rB1Lnstv5qra3j2kYUk79Zx61Ue1q/3h/279Wj4vDud9f+TBfG5cQ8LHvXqdkSt43n2j/aIwEKOuuANQGMNjeH++a4Vysjwln1R8T3kLabJrAendcm70u5sV+vLvy37rR4mS2YkLO3rz/61oTTeAoJJEhgfS7PapBjw1U3nbF5lY8/VxNeHnMp91pV+yKrlK4uxbM+ptVvmLhzOxvGzpzllbfR+RyveC4JkEBqBPYNpYXTWQm6G1WwoLbCKNvdzRGvuynbuppWR8vjwGLGAM+bw7ft7ha9g73BqS9uGZe6Tey9O8rlbEE1FZaNu4xDAiRgTSBkRNsmsiXodQMU0lGvaWWWHa+sLhjHfXOlapi4b65mfrTSGgJszECkIM42oSngVzJjUIgxpbRqft6+ftGq182j4dddzhYURfGrkoPvVKr4miz5JQESmEXgvO2YZSqCk1sNn20/IALPbVzILDs2WXYd52njefO5980rjKE7HNwUWl/J9PSVCPRQKDTUW59ZgV8YlWPmAOHs4MIbLjpAzSy8efXRDySPX5Ml36XeBMN1EphEIFaRmJQZ1RL0aUZ4Vs4Eqj8wubN4xtlE7Vxi5CxipCFyEODzSOcifX7sfAsCDhuwhQC/YPs8VhxbLkfnceSIXpAACcRKgIIea8lE4leh62G19GPl68aptshBlMcECHjbhhvP3Fp52Glxa5/WSIAEIiZgP0ZxlglbQXeWIA2lRqCulWVZlS49r6fO8dLYyllHYax/dc7GnmUf//7+3ikz+5QZkwRIYHECC7RsFPTFSz1eB3D/3HgnI2Lrt5CZc/qW28Yv5jHa7ovne7+P6w0/7PPttwv7vjszLnykDRIggXEE4hD0cT4zdiACWpv75+6kb9wv5mOSHTtfNpvN8ZqK4U11fVXFXYn2pcD9JEACoQkcG59QCds1i6G8YTqXCEhZyRfT4tpJ+y8j/g82Rf1+ODFYyah/oP5JrEsOBj128qVS1Z9XSn8jaPKLJravBot64C3xjLPmjRkNR0tgoEF173fl3uSQRR6fSeDuzs294EJXf2xcefMqrmfFjV9dy3abL7cJ/uLNq4/+tiuu5LEdvStaYvsyvmozzlpilYzuOiDgQNAzbL8cgE3dBF7gYvLgYuq4aW/O/9BmfAq5nNbmTzsrZL5WlRabqVUV91oz60DQ3TZcyV13mdYcuX9+yNn88sUPxQqNF8Jg+n7e/9B2cCrihY7YtxW7Nr8arxges54KAQeC7jaryV53mbXjWmmNki2r+ffP8fY32EKQ6ero6hz8ch2kHsvXtVXaIwESIIF+AqtoXPuz3zyy16/mjnHrfprvcT44iv302fMPjam5b2C73t0cn8XGy2OM3RyXmIkw+arq9/GYTS5JIBECM9vBBXKZnsf+IMUp6IuUUEaKPLu+mMfV5hnCI2r6MNLHq1rnWYv/7M1mE+f1FD+6iDzUEfmyhCvptYOxeBxDzYmzAYqlhJa4nnrS9FJZetIyv9SuVDWrJDZFPW2PO+fDj6j1OJPQ7tPvDpS651viEiq5pqtdVT7k1df0hespEeiqOaH9j1PQQ1NIIL2wlaVuwMpSHafLxyI6n2p/WRscaySx+JJJ+YqYl7n/8C+xgpntbtirb7a7NLBaAhT01RZ9d8ab989lVD3pda+HqfajuHWnlONerTCrIdx4XS1VvPtat1TiTJcEliXAhmdZ/r2pB2uXWgnJtPHxv0vtdW7ggJlqX5+4VWotv+IfqALLHU5kMN267JbjxZSzIkBBj7Q4g7VLrYRkjLlva2S3fMfD2e5uj+d5Fbfxrnk/45NX67i14B3kChI4XiQT8rq/QCecx1PyJ0BBz7+MR+awbi6mvO4VU+0msd5ftdfmTTQuSYAERhKY0xkYmRSjJ0aAgp5Ygfl0V+6ff2Dsj33dK57BPk21q/7/eCWN1shgWOGSPa4VFjqznAkBCnqAgkyliayq8ptTcZy/DS6d/3hlan7zPY89rsGyTeWCHswII+RGgIIeoERTaSK1ntZSXe9uj4+3+fqPV6Z5ZlG43gxfSJuH0iaQygUdG2Vea95LhILuHXE6CZz03L7FwlS7XKfyVQr3zcdO1dvSsffI1uIhnjfDB/srWOwLfwX5ZBZnEuC1NhPg8OkU9GFGK4pRX3HyV76Xsw0h3+5uquZUO5+/vsws0NHgyQxWluAeMUESWCcBCvo6y70z1zLSkq9S1YX/WOTps9u77e72IOT76Htbuf/HK/tM8g8JkAAJREyAgh5x4YR3rRboqjofc2E0fr27KSHkhVYbdfxUMs1e3lPMj0DyX2EODwTqa+WwwYUQIBGBsPCXgr5wAcSYfCGqDb/q0Xg9ra4P/2sa9ovcVxBxvEjl0x9+d9LrYWGHgQTSJSBXQbrO23uu7aOuhIg9kAViUtAXgB5rkmWl9tekXMP6NBqXrb3DlcJxCPmbV3wsbY+Ef9wQMFVMKTf2aMUdgX2L4M4cLfklkKGgs3WYWmWqqjw+fmZsVHJHvaz0X2M0/vY1hdxw4dIhAYqGQ5gxmmKbHKpUMhR0tg5TK09z+rwUJa9H4y+Lt68/+tZUmzyPBKIhQEcWIsA2ORT4DAU9FLo80yn3o/EX+i1H43kWMHNFAiSQLYHIBZ1TNaFr3luOxkMjZ3p5EGAuSGBxApELOqdqFq8hdIAEPBJgl90jXC+mWWJesDoyGrmgO8olzZAACURJgF12y2KJJhpLLJqi6HCEgt4BhbtIgARIgARIIDUCFPTUSmyV/nKab5XFzky7JdB/GblNh9YWI0BBXww9E7YnwGk+e1aMSQI9BHgZ9YDJZzcFPZ+yZE5IYPUEvA5CvRofU3TROGLnNGMFI0BBD4aaCZEACfgm4HUQ6tX4GDLRODLGacYNQICCHgAykyABEiABEvBCIE+jEydhKOh5VgfmigScEJjYrjhJm0ZIYLUEJk7CUNBXW2MiyTgVI5KC6HZjYrvSbYx7V0Ygg4s7sRKjoCdWYNm5m7VisEHLrr4yQyMI5HJxp3MdU9BHVE9GJYFxBKRBk7ZAvuNOY2wSyJVAkheDXMd+yuPcqgM2FPRzpNwiAbcEpC2Qr1ubtEYCqRLgxdBfcg7YUND78fIICWREwEH3PyMazIo7AqxZ7ljOtXQm6HON8XwSIIFYCTjo/seaNfq1KAHWrEXxnyVOQT/DwQ0SIAESIAESCEfA5QxHQEEPByitlFwWZ1o5p7ckQAIksHYCLmc4KOiL1yaXxbl4ZugACZAACZwR4JDlDIfXjWwE3SslGicBEkiawFhRGRs/aTieneeQxTPghnkKegNGVKtJtChJOBlVsdKZiQRaVa21OWh0rKiMjT/oACMEITC2XgRxKmAiFHQr2AtESqJFScLJBQqPSY4nMNAUt6paa3N8cjzDOYGBEnSeXpfBtdcLCnpXreA+EiCBwATW3hQHxu0hOZagB6gjTVLQRwKbEn2o5zrFJs8hgeUIsEYvx54pk0A/AQp6P5uJRx42duy5TkTJ0yIlwBodacHQrZUToKA7rwCxNXbOM0iDJEACJEACERKgoEdYKHSJBEiABEiABMYSoKCPJeYp/sOJ+lZCgxFa8QNtrisZFsK6yjue3LLmxVMWMXtCQY+kdAYn6gcjRJIRWzeSbKFyKwTbwmK8pQmMrXlJXl6TIa8rt5cwUdAv0eExfwSsWih/ydMyCeRMYF2X17pye6ne9gg6ezyXoPEYCYwlwCtqLDHGJwESGEugR9DZ4xkLkvHTIxDS41lXFHsDIYuKaZFAsgR6BD3Z/NBxEsiPwKzeQH44mCMS8EIgg44zBd1LzaBREiABEiCBpAhk0HGmoMdU4zLoIcaEk76QAAlEQoBtW5CCoKAHwWyZSAY9RMucMtpMAjwdBKgSoJBEGNG2sVSnlygFfTo7nkkCJLAogREqsaifDhJfkcqtqFQdVIxzExT0cx7cIgESUIkjyFH8qHKJV8ow7lPQw3BmKhkT8Kcf/ixnXBxKUfyyLl5mrp8ABb2fDY+QgBUBf/rhz7JVxjxFolkSIAE/BCjofrjSKgmQAAnYEchoIqYrK1377MAw1lgCFPSxxFYYnxfkCgs92Swn6HhGEzFdWenal2ApJeFynoI+QYEmnJJEAbtwkhekC4q0QQIkQAJ+CeQp6BMUaMIpfkuG1kmABKIjQIdIIGYCPwMAAP//GnjRvAAAAAZJREFUAwBIteHXdIWinQAAAABJRU5ErkJggg==', '2026-07-15 15:04:15', '2026-07-15 15:04:15'),
(2, 'client_kyc', 7, 7, 'data:image/png;base64,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', '2026-07-15 15:04:33', '2026-07-15 15:04:33'),
(3, 'client_kyc', 1, 1, 'data:image/png;base64,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', '2026-07-15 15:05:14', '2026-07-15 15:05:14'),
(4, 'casino_table_cave', 1, 1, 'data:image/png;base64,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', '2026-07-16 10:00:49', '2026-07-16 10:00:49'),
(5, 'casino_table_cave', 2, 1, 'data:image/png;base64,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', '2026-07-16 10:01:43', '2026-07-16 10:01:43');
INSERT INTO `signatures` (`id`, `signable_type`, `signable_id`, `client_id`, `signature_data`, `signed_at`, `created_at`) VALUES
(6, 'casino_table_cave', 3, 7, 'data:image/png;base64,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', '2026-07-16 10:02:10', '2026-07-16 10:02:10'),
(7, 'casino_table_cave', 4, 2, 'data:image/png;base64,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', '2026-07-16 10:02:38', '2026-07-16 10:02:38'),
(8, 'casino_table_prolongation', 1, 1, 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAfQAAACMCAYAAACK0FuSAAAQAElEQVR4Aeydz48kyVXHI7JmsGFn+oflmamRJYSB7eoLcGGFhGTJBwQSElyQLW6Ig5GAo68YyWBue7WQLPEf+MQd+eIDks0FLlMN2ObATnV7Ybp7YL22uzL8XkZlVVZV/s6IyIjIb6my8lfki/c+72W8jMisqkTgBQIgAAIg4JiAdFwfqpsCAST0KXgZNoIACHhGQHmmj1/q4HKnnz/sJvR+OuEoEAABEACBlgRiTH643Gnp/INiSOgHQLAKAuETiLGJD98rtixA8utJNsLTJOSE3tOLOKwTgQiDvpP9FgvbQxtxE28PmiFPe6+gITsjEBPAadI1mpDQI4hLqyYEEPRW7bcoHGh7wHUBrWsrumeGCwX3KsSKIwKDwqKnjl2jCQm9CvTh9jG8eagD1s0QgC/NcIxVStdWNFYOsGuPQAhhgYS+57KalRC8WaM+dhUIwJcFGAEs4gIsACeNpSKCo0geCb1Iw93ydGrC+Ra5rx04GBdgkcfQEPMGBIeD0O1j2RC1kND7ELd8zBCHWlatu/gB51v3yuiIqOCRPS3e45rs2sEtgLQsMi63lkqimD0CnobuELWQ0O2FS2/JQxyaVRr5R21DHCS8WosavRmkyY1W2S8wLW7DYsy+N1CDCQJI6CYoQoZTAvE1xPFZ5DQgUFkLAoixFpCCL4KEHrwLnRuACkEABEAABDwkgITuoVOgEgj4TACDtz57B7pNmQAS+pS976Pt0Ml7AuMN3uJSwvvggIKjEkBCHxU/KgcBEGhPYLxLifY6uijp7sLGXU0uuMVfBxJ6/D6GhTsCWIqOwBRTjrsLG3c1RReYoxiEhD4KdlQKAiBghgBSjhmOzVKmeOmUUQnIcCT0zGPmPgLyvTmjIUkTwCcIGCfgT4sy2UungAxHQjd8Agbk+06W+9OsdFIbhUEgcAIxtShoRWwHIxK6bcIb+aGHckzNysYloc0q9A09sirMwuYICaAVse1UJHTbhDfyEcobEJgZJoDIMgwU4g4J4JrxkIi360jo3rrGvGI4L80zjUYiDAGBKgK4Zqwi4912JHTvXGJPofbnJVK/PS9A8jACiM3W/EZDNVrFrdHEWhAJPVbPDrKrfeofVA0OngoBg3YiNlvDHA1VXcVI9q3916NgRUL3B7o/mvSgi0NAAARAAAQKBOqSfaEYFnsRqEjo/kD3R5NefHFQ5ARwwdnVwRaIdVUB5UGgjEAEoVmR0MusdbMtAqZuQPley0QciQvOroEIYl2JoXwZAQsNTAShOSChWwBKfouAKVmBt4AjEQRxEIAVXhJAA1PmlgEJ3SRQOxcHZQb7va2aQ/Uevy2CdiAAAiAAAm4IDEjoJhU0eXFgUi/Xsqo5VO9xrSPqAwEQMEYAgkDAIAFPErpBiyAKBGIjENvwTGz2OIk3QHOC2Wkl5n2KhN7VgeZ90FWDSZefJP7Yhmdis8fJGdkLmhPNskomeWJmlg/46OjTFoyR0Lu6o6MPuopH+XoCwF/PB3tBYBQCODHtY2/BGAndvhtQAwiAwFgEWvRqxlLtsN6AVNWq49M7AkjoFl2CE9QiXB9Fw+G9vWINXYteTW+lDR8YkKqGLYc4UwSQ0E2RLJGDE7QESsdN1hr6jnq0Kg6Ht8JUVgjoyqhMehuM70GgNqEH1Zj2MN7rQwA/c090DT38mvk19A+40UcPTskr5bbWJvToGlMfY7BKJ8CvIhP2dvg1bP9ttIcbNyC8mnXwild691Gm3NbahN6nGhwDAiAAAsERKO/wBGeGFwqD5WhuQEIfDT0qBoEqAmgRq8hY217e4bFWXdSCwbKje82d70joHdGjOAjYJ4AW0T5j1AACvhAwd74jofviU+gBAk0EzF3IN9WE/SBgnICz8HVWkXFE7QTWlEJCr4FztGvCgXLEAhvcEzB3Ie9ed9Q4eQLOwtdZRf65FAm9i0+CCxRcgXRxr6myT569+9HZfJGezxfK9nT6YpGW6Q3Pl1HBNpsEEHM26baTbSCht6sIpcYgENwVyBiQjNRZTOKPZ8nPU+NGbyOiewmB53thw0EDCCDmBsAzdCgSuiGQEBMegdP55fvcwz2fXxz1pM/mF6U936KV9UlciVQJ9dOH9drGJASaz6IvsAwCICCE9wl9mk6S0zTbptUbpKfzxXfyBJ4I9eVECin4LfZfUkh5+uLyn/e37tY44Zf1xCnNqjerpXyzupJ318vk/z78j0c2pp0mbZdk24JxlLNirhWhHXiPXX8HVVF0FAKjJHSEZZOvKS00FTnYD6YHQA5WT59ffoMTOQX8bwqxT4toq1TJB6XEP/FEvV/aJEQi1W+Jktc53RuXQsp8FxVWaym+won8drWkKvI9NfPt0TVljO4iLY3K81yYFXOtCO0Acuz6O6iKoqMQaNf4GFbNn7A0bNiI4sC0HD71sr/BvWkp1ZeEyLOoEjSe/l1OwDxxEr67fvX49nr5OzylQn5RbF507HqzKJ58+t2fcDLP11Mlst44H3//evm1fHurORzWChMKgQAItCcwSkJvrx5KTptAnoD7UTibL1LqZX9JCinlRkSq5CobDl8t39tsOprdrZbfpFyd8g4pZHaOnDy/SB8/Sh7ztnxS1J3PlzEHARCIiIA0a4thcZXKZY1V5V7sGEQABw8l0K8by4mce9J0EtFb67BW4sfcG6ee+Eu9pf5TqeQf8hKczGeJ3MrKt2MOAlYIINKsYO0ktF/TU1mFYXGV9RhJ6Ii/Sr7Y4ZDAyfNFNiRO8UhvXXGeyO+vl5/UW9p9UuL/s7wkknlOAnMnBFy1/k6MQSUuCRhJ6FHF3zYVmHODBZFCiDr98hrzeV3Z8Pedzhf/yj3yWSK2Q+KpUin3yLsmcrH3iiqy9yzDCgiAQHwEjCT0qLBYaMMtiGxAnteYzxuKe777hO5fc8J+8ulffThU9Wx+kVIQ/1q+ne59Zw+q3V1fzfJtfedKSLU7trC424glEAABEPCGALWF3ugCRTwiYFqVIWMFySZKHz+azc7mi+xhtZPt8Pru3jZ/dex2dbUpPcyCJ8/e/Zh0pjfJyT6zD7Gmrj9twRsEQAAEvCNQ3vjptss7Zd0rBBCmmA/p3z48pJTEtQTyiOTeenF4fZ2Kn2bD612/OlZj3KNZ8nPb3bpqwb3/+xszFwxb2VgAARAAAUMEyhP6pgEzVIfnYihFVGo4KRCVFMzvaJZ49uLyH7k3fj6/UNwzF6LMT0pkifxmuUu+wsyLv1tOvfHtd9AFpXNTvX8zGkKK3wTK4tVvjaFd+ATKE3r4dnWwAEm7AyxrRU/nlx/rBK7/oUxK9QfUJOr3Xq1Ff0lRdl99r3jfFaqZeuOPOJGziFQkP+H5/iQLCX9/j79rZJi/ylVoFqLOqsKWyDeH6KqIXOImocPJEYXMcFO49334pyiJUJ+gMKH3vnxqFlWq0o+4J66nK8l/dpKX4t47Xwjk6zw3MlHFLEcp+ZbniUizUYCTl4u/4nWe7m+W26fqeT2MaWNYGMputAxR543qU5vBVaN63E1Ch5NHdfLYlVPv+3846fLw+fl8obj3nUgeQ5cHqtFdauoS88NtOnkvJQ99313/+ztcOi/Mf3bCSZ1KZ5FFUuTZ/CKlet7Pyxicf1/LolpoQabib2iGNwiAAAh4R8BNQvfObChki0BF7/tTlA71u1AxJ+SUPvLkzT/Jygm89HfRs9S9O5iTOt/TpsOzPVJImQj1ZdND8LfXy9/Ia+XfhU+kkrye18vLXk6Zll5qBqVAIDgCoZxOSOjBhZafCp+8uPi4Te+7OHzOCfnuuuW/k1WYzTLWqcqSOhexNgRPwqVQfyyEPrX5uXvh82tLxGclJ6ibDp8JGm7K5HEAhnI6IaGbirMJyzl5sfjPmZSf2EegBPe+d8PnV7vh8/2Cg9fub64SHoKn0fpMFp3yhofg9elMtwqeZhXQB9dJs+FvUrYopP1y7wPbV4GS5gnoUDIvdzISAbDO1T0SOhqSOqBT3DeT4pdzu4vD59z7vn991e1vRXNBHec8BM9D9kro3roU0tgQvNo8GCeEFMZfA9un9XqdGtcJAkEABIIk0COhD2yBgsQEpasI8DB7vo+Teb68m7uNFxtD8HKmfn9nDy+xTRaSO4tuMRWftOcLmRaHbIpgBgIg4CsBEy1Kj4TuKw7o5ZoAP1me10n3sb35TjYPhx8OwZ/PL1Tfp+DffHD17dxOnqeKf+OdkzqvuZ/wpL175qgRBGwTMNGiIKHb9lKk8k+eXzxIoX9HnZM5JdFHPpnKPVc9BC8254kUw56C34gRQlBCv6HZaG+6l7+pe6fTZsOoM1QOAmMRkGNV7Fm9SOieOSQEdTiZzxKZ/ZtZSjetfUvmRYb8NTjdW9db+z4Frwr/vPb25tVcSxvnkxovegu6UuGRgnF0QK0g4BMB5ZMyI+qChD4i/BCrzp5o3yRzTin84JvvdnBvXSd1fdpTNpRDhuAr7SXBlfuM7tAVpXQ11V+sltH/eNdHoj4QAIEmAkjoTYSwf4/AbO+J9qtgsgIn9SFD8GQovTWK4kNpesvmU18vbFbszIp1398M+ec3B8rWItjirC2FnSAAAu0JRJ3Q0WS0D4Q2Jc/ni20WKH+ivY2UccuYGIJPUvGnY1kRzwNx21AaC+VevfGsoNWLx5fdLYk6ofdrMnBCNIXRWonvNZXxeT/31o+H4Beq6mdji73izC4pX2TzET70Y4hccb/o5iMxxUwAcRGzd5tsizqhNxlfvh8nBHOpu6xRSn6Sy4Q8cVLnIXi6Db11OD8wdz6/OErsiRJ7f8giRfrOWLaTX+jNTy/ggbixfNC9XhwRB4Hs1PPalN4J3X/TbHGfhuXbLFeCkRLay5LNQW7ih/qKvXUhpDhM7FLoP2QR29c4MVAcKXh4wC/Ebd2BBRCoIdDmbG1Thi+ja6rxYlfvhF7X4He3rB3O7nJtHGHWchsa2pOpbU+SkPzVTCPvra+zP3nRNopNYj+bL1JeFvSiFPpAs+xdTK7ZBgcfxZEC1tlBlagiAAKZinGdkplJpj7yM7pOXpsydcf7sq93QjdrQCw4zVLxTZrafBf7uMfqm6b99OGnxnkYXid2LYPaSXrrZTETX90sCZmKz+bLruakCL2zfoJyVSfqCYRA34jIIioQG6FmIwFPEnqjnijgAYHd957jbgV0Yl/KYmJn/DMl/pbnPBGBP+K5q6k4IsBP6ruqF/UYIkABY0iSWTGNFwJmq4M0uwTaJXRfg9EuG0g/IKBE8vpgU9yrM/nXVQZKqU6r9tnYvhtuRwtsg691mXCbdcSoQIh2CR3BiFghAm9vXn2GZtn76fPL/84WIv4o9sj5e/fFJ+KFkOJ8vlCnL/geu7D+koIqFIJ/Rx5nI3EI/k0ODd4GAwb4LSI8J7VL6H5T76xdeG7qbKL1A6RIo3nSvQxWMVE/rNVbLrN7Ip7X9JRIITmx2550bUKwDvky5pqA1LOwPnFZFoC/wnPSJBN6inOZMQAACytJREFUeG7yKfY1vdiedC8Sfvrs4p4TNW9TQqm3P7w64WWemp4u13S4pI3JrnQbGruQCSouKFfU4fXVVIXOEW+eZEKP2J/WTVNC/6CJPPputvWqDVZQ3wo9msmneWW3q+rfSycW/8vfYS9ODw/rdXHd5DI/gZ/rhTkIeEFAudCi/nx1oUFVHfY06ycZCb3KU7a29/OTLW06y43jSffqVuhsfpHmUPi+eb68P1eZACnSc+6xu5r2dRhnLfDwHQcaah1IIDvdBsowfzhLtKdZP8n1CR1nL/vM7NTPT2Z1GCBNJvJfBhzu9aEnzy9SKfSvpR9+Za2ouBLJG72uy+rlaXz6HL5yGi6AlUEQGCca6xO6z2dvEE6NT8m71fK93KrYnnSfJTpB833z+5q/JqXTov7PacY5l3O3THZOfultO1zWGx0OLCUwJBpZYL+pPqH3k4mjJkKAhpxrnnQPq4nkp9Rzt93W3DfnMnerV9uLmtP55fu8bW8a51zeUwEr3QjAZd14obSfBJDQ/fSL51rp5q/+SXddxnNDMvV4qD1boI+6oXbaffSWSv3u0UZsGEQgrEvBQabiYBAwSqBtQjdaKYRZJmC5RVRRPOmufcBfUWs71K6PyD/1g3F0y935b7rnGghh2dFinJcap1rUCgLBE0BCH9uFNtpkyy1i8Ul3uo++6ofQhuHdNWn7FbVDyfmDcXTb4cnhPnfrlh3tzpDBNR1H0/GWwZVAAAh4TsCPhO45JKvqBdgmF590f5SoF2fzRVr885B2vMY3/KzVV9TKrSHtNw/GIXGUE3K7lfxxUOHxloMCWAWBLYFYzmIk9K1LDxcMudiQmEPtxly/Wy3fS5X8SAjdaJKJkn/3/IwS+5h6damb75tLoZ9q73rfnOuRQnyB5zx1v5jhozCBAAj4QkC3ZL5o01+PKST0nnQMudiQmJ5GWDvs7vrVO/zLZTqx62ooyWW/a87JUm8Z6ZMUaao5v2/OFyV1X1GrknO7evWDfF+Sii/my5iDwOgEWsT/6DpCASsEkNCtYJ2OUJ3YlzJVm+46mc7Jkr8G1v/+OgkZ8m64iDqfX2xL8EVJ/6p8eDCuv/ZTOnJSOW4b3bF7eFJebeXMVgkd2GpYYldG4O56SR1V8W+U17fNCd9f5+Tp05C0Hj3QEd1nqD0zdvOhRPL/vDjug3GsAaYmAtugbCqI/QERgFcPndUqoQPbITaslxGge+u/fru6Sh5Sec1D2bqMFPn99drErnOssPnq/xW1Cq2U+r7eY0p5U3K0VvgEARCYFoFWCX1aSLyyNkhl3t68mvNQdpo9OKdNoFSVPTh3+mKR6i0Hnw6uGmu/okYKHmjUvCrlH+aFai9W8kKNcwcQGnVAARAAgVAJIKGH6rkA9L7LHpzbv7+eSJE9OJcNxT+/6PF1t36Gc335kTSC8EG+vJ33yKV7D8Yp8XtbWViIgoCMwgoYMSUCSOhT8vahrY7W77b313cPzgkhBT88x8Px5/OFOp9fKO690z3uB2H4dU7yBdUn6MX3zWkE4TO0aOStpPoxC5JC/TbPMcVDoMc1XjzGw5IgCZhP6LisDTIQzCldHgB3qyXdX18mayGWnFSLD8/puqXg3jsl+RknYJ74e+1DEvzJi8v/Yjli8+J672v+RW1TrNtMye/oA2RiZthdS8MnCIAACHQlYD6h47K2qw8iK78NgFK77lfLS06qt6ur5M1qKTnBp0r8iI6i9/4hdGkg9xM8DdG3HKZ/+uzidibVL+YSrSRzEn67Wn6OZtlbpvIvswV8gAAIgEADAWrfGkp0320+oXfXAUdMmAAneBqS/wVKjFmC5yRfneAlJ/js4TrueddNj2byNMe6luIrfBGRrxufS/Uxy0xk+pznbiYbzYEbzVELCIDA7ntAJlkgoZukCVlGCBwm+IdUfEhJnnrw9M5raDnnC4T718uvtSzeq5hS8rv6QJfD7t1ZaB0rPrtcH3QpW1EdNoMACJgngIRunmlniWgf65G9vVk+oyRPPfgryQl6rcT3HtbiTdPEZeslm9lLowvhD7t3uT7oUtYMYkgBARBoQQAJvQUk20XQPnYjfH+9/JW3P1x+qmnqJnWvdPcVQ8PuuLjrjh5HgMARgYmeSEjoR5GADSDQncBayL/TRw0bdsfFnaaIT3MEJpnbJnoiIaGbO2/CkzTJM92Om4r36RufdjekAtxnCGTkYiaa2yL3arl5SOjlXKxu9aYhxplu1M+pkisWaP9pdx1BQbhPq8pYMEVFAI710Z3jJHTvY8GugkE0xD5Gq+c63V2/eqlVlMnZy4s3ernHZ2P41UZQjwotHhKQqhYpRCgajvXRqUcJvbEtMWGF97HgvYImvAAZFggoqW5ZrFTy7HS++HNe7jypzkfgABAAARAQRwl93LbEyeUE3A4C1gjcvr46J+HZaUQn19c5qZ/NLz9/Pl98i+a/RPvCfkN7EAABbwlQm+NSt6aEnbWDLhWyW1eTuXZrh/RRCEiRCpH/BKykE+zrUqhvkSqfFyL9E5r79UaM+uUPx9rA/Y6BW66O2puDGqx6OLKEfYDuaDV6cxuCpWH3Ea8oNihxt1r+vZLiw405OYUf3K6uvrrZ5s/Mrxj1h8tENIH743L0cUKHh4PzcJ4x3CveECwNu93r667G29fLZ9RT/wuaviAS9bk3q+Vn3dWOmowRGO/kMmaCUUHgYRSnaWHHCd10DZBnncCE86Z1tkMquKOeOk3ffPPB1beHyMGxhgj0EYOTa58aeOzz8GwNCd0zh0AdTwhMoicyCSNbBhRYtASFYh4TQEL32DlQbUQCk+iJTMLIlkE0mEXLelAMBOwROE7ooVyo+qKnL3rYixFIBgFHBMycTGakODIZ1YCAQQLHCT2UC1Vf9PRFD4NBAVEgMA4BMyeTGSnjEKisFTtAoAWB44Te4iAUAYFBBNCFGoTP7sFwjl2+kA4C9gggodtj203ylNpRdKG6xUZVaSsxA+dU4Y54uxemWQlnLyxzp0RECT3wcEA76i7qY6kJMROLJ2EHEUA4E4SB74gSOsJhYCzgcOsEAr/otM4HFURJYFJGjXuOB5PQx8U0qYiEsW0I9ApIXHS2QYsyINCdQK8Tsns1jUeMe44Hk9DHxdToxWgL+HKaGAVswqhAA9KE6UZ9MQFhYG7VyRvhgZ6QG+1NzcZL6IhyUz60KifK06TWqLgDs9Z0q5E0XeGdmMcdftMNAkeWj5fQO0W5IxqoBgQEAhNBMCIBhJ8D+B2umhxoY7KK8RK6SSsgCwQGEOh7evc9boCqkR0KgpE5tN4cb9wd71WTo4TujSfrAw57J0mg9el9EMatj5sk1YLRB9x2ewwQrJS9qwVLTMAEqIEyDLibLYloMm6Ko4QOTxr3HAS6J4Aw7sfcJjebsiutHZjYKuXa3GECVC4jRPttsvVHtqOE7o/B0AQEQMASgcm083lis8TRe7FTt99fB+0ldH/VhGYgAAK+ETjK32jnfXMR9HFJ4OiEcFm5rgsJXXPAZygEPDhpQkFlW0/kb9uEIT8cAtQweXBCOEzo4bgGmnpMwIOTxmM6nqpGjZ2nmkGtKROoj8v6vYfc/GiYkNAP/YL1WgLdgrxWFHZOhoAfjd1kcE/R0F4NU31c1u/1E3I0Cd1PvPFpVRbkvc6l+NBM2iLEwKTdP77xZQ3T+Fo51wAJ3Tny+CrEuRSfT7tahBjoSgzlQcA8AST0VkxRCARAAATiJoBRlvD9i4Qevg9hAQhUE0ArXc0Ge/YI9BplsRZf1gTv2RzbChK6Bx6FCiBgjUCvVtqaNhAcGwFr8WVNcGwe2LPnZwAAAP//DdwgWQAAAAZJREFUAwDdlZ6CdfA1qQAAAABJRU5ErkJggg==', '2026-07-16 14:18:20', '2026-07-16 14:18:20');

-- --------------------------------------------------------

--
-- Structure de la table `stays`
--

CREATE TABLE `stays` (
  `id` bigint(20) UNSIGNED NOT NULL,
  `reservation_id` bigint(20) UNSIGNED DEFAULT NULL,
  `checkin_at` datetime DEFAULT NULL,
  `checkout_at` datetime DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

-- --------------------------------------------------------

--
-- Structure de la table `stocks`
--

CREATE TABLE `stocks` (
  `id` bigint(20) UNSIGNED NOT NULL,
  `product_id` bigint(20) UNSIGNED DEFAULT NULL,
  `location_id` bigint(20) UNSIGNED DEFAULT NULL,
  `quantite` decimal(15,2) DEFAULT 0.00
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

-- --------------------------------------------------------

--
-- Structure de la table `stock_locations`
--

CREATE TABLE `stock_locations` (
  `id` bigint(20) UNSIGNED NOT NULL,
  `nom` varchar(100) DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Déchargement des données de la table `stock_locations`
--

INSERT INTO `stock_locations` (`id`, `nom`) VALUES
(2, 'Restaurant'),
(3, 'Bar & Lounge'),
(4, 'Casino');

-- --------------------------------------------------------

--
-- Structure de la table `stock_movements`
--

CREATE TABLE `stock_movements` (
  `id` bigint(20) UNSIGNED NOT NULL,
  `product_id` bigint(20) UNSIGNED DEFAULT NULL,
  `location_id` bigint(20) UNSIGNED DEFAULT NULL,
  `type_mouvement` varchar(30) DEFAULT NULL,
  `quantite` decimal(15,2) DEFAULT NULL,
  `source_module` varchar(30) DEFAULT NULL,
  `reference_id` bigint(20) DEFAULT NULL,
  `created_at` datetime DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

-- --------------------------------------------------------

--
-- Structure de la table `suppliers`
--

CREATE TABLE `suppliers` (
  `id` bigint(20) UNSIGNED NOT NULL,
  `nom` varchar(150) DEFAULT NULL,
  `telephone` varchar(50) DEFAULT NULL,
  `email` varchar(150) DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

-- --------------------------------------------------------

--
-- Structure de la table `tables_restaurant`
--

CREATE TABLE `tables_restaurant` (
  `id` bigint(20) UNSIGNED NOT NULL,
  `numero` varchar(20) DEFAULT NULL,
  `capacite` int(11) DEFAULT NULL,
  `statut` varchar(30) DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Déchargement des données de la table `tables_restaurant`
--

INSERT INTO `tables_restaurant` (`id`, `numero`, `capacite`, `statut`) VALUES
(1, '15', 4, 'LIBRE');

-- --------------------------------------------------------

--
-- Structure de la table `units`
--

CREATE TABLE `units` (
  `id` bigint(20) UNSIGNED NOT NULL,
  `code` varchar(20) DEFAULT NULL,
  `nom` varchar(100) DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Déchargement des données de la table `units`
--

INSERT INTO `units` (`id`, `code`, `nom`) VALUES
(1, 'KG', 'Kilogrammes'),
(2, 'G', 'Grammes'),
(3, 'L', 'Litre'),
(4, 'CL', 'Centilitre'),
(5, 'ML', 'Mililitre'),
(6, 'PIECE', 'Pièce'),
(7, 'PORTION', 'Portion'),
(8, 'BOUTEILLE', 'Bouteille'),
(9, 'BOITE', 'Boite'),
(10, 'SACHET', 'Sachet');

-- --------------------------------------------------------

--
-- Structure de la table `users`
--

CREATE TABLE `users` (
  `id_admin` bigint(20) UNSIGNED NOT NULL,
  `nom` varchar(100) NOT NULL,
  `prenom` varchar(100) NOT NULL,
  `email` varchar(150) NOT NULL,
  `mot_de_passe` varchar(255) NOT NULL,
  `role` enum('admin','manager','receptioniste','caisse','water','housekeeping') NOT NULL DEFAULT 'admin',
  `statut` enum('actif','inactif') NOT NULL DEFAULT 'actif',
  `date_creation` datetime NOT NULL DEFAULT current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Déchargement des données de la table `users`
--

INSERT INTO `users` (`id_admin`, `nom`, `prenom`, `email`, `mot_de_passe`, `role`, `statut`, `date_creation`) VALUES
(1, 'Admin', 'Super', 'admin@hda.com', '$2b$10$8w.JmgRVauS1ciHTxEi0jOiaUAN5mMr4GxyG6Qrp7ERTo7bbUD4ne', 'admin', 'actif', '2026-06-30 11:31:12'),
(2, 'Dupont', 'Jean', 'jean.manager@hda.com', '$2b$10$YbodZ1JKLUT8N/HBPYRLb.J7T.0omn.yaNV9MMQhCTVSgBThlaaKG', 'manager', 'actif', '2026-06-30 11:31:12'),
(3, 'Martin', 'Sophie', 'sophie.reception@hda.com', '$2b$10$ErLLgrT6aspas8CG6GD0..0etjHA8WqmBbZi0tLkErV8F23PNPn7S', 'receptioniste', 'actif', '2026-06-30 11:31:12'),
(4, 'Dubois', 'Philippe', 'philippe.caisse@hda.com', '$2b$10$tYejOeNoxJmlS4NvE5dTC.nnGs3ozbQzzDI.a989jDXVRbPpHo4lq', 'caisse', 'actif', '2026-06-30 11:31:13'),
(5, 'Lefevre', 'Nicolas', 'nicolas.water@hda.com', '$2b$10$ckkBl6c1ImigmKR/eEwkEutKH4uzn1tD28ZxJqLwovbsWPsju5mlS', 'water', 'actif', '2026-06-30 11:31:13'),
(6, 'Rousseau', 'Claire', 'claire.housekeeping@hda.com', '$2b$10$ibosLGjTRMDUkrGHUF2k6uJDVI97V2uoygzQQ5WSaRZ9qaYfOioUW', 'housekeeping', 'actif', '2026-06-30 11:31:13');

-- --------------------------------------------------------

--
-- Doublure de structure pour la vue `v_casino_ecarts_caisse`
-- (Voir ci-dessous la vue réelle)
--
CREATE TABLE `v_casino_ecarts_caisse` (
`session_id` bigint(20) unsigned
,`caisse` varchar(100)
,`salle` varchar(100)
,`user_id` bigint(20) unsigned
,`ouverture_at` datetime
,`fermeture_at` datetime
,`fond_initial` bigint(20) unsigned
,`fond_final_theorique` bigint(20)
,`fond_final_declare` bigint(20) unsigned
,`ecart` bigint(20)
);

-- --------------------------------------------------------

--
-- Doublure de structure pour la vue `v_casino_encours_credit`
-- (Voir ci-dessous la vue réelle)
--
CREATE TABLE `v_casino_encours_credit` (
`client_id` bigint(20) unsigned
,`client` varchar(201)
,`nb_credits_actifs` bigint(21)
,`encours_total` decimal(42,0)
,`prochaine_echeance` date
);

-- --------------------------------------------------------

--
-- Doublure de structure pour la vue `v_casino_produit_net_jour`
-- (Voir ci-dessous la vue réelle)
--
CREATE TABLE `v_casino_produit_net_jour` (
`room_id` bigint(20) unsigned
,`salle` varchar(100)
,`jour` date
,`total_entrees` decimal(42,0)
,`total_sorties` decimal(42,0)
,`produit_net` decimal(43,0)
);

-- --------------------------------------------------------

--
-- Structure de la vue `v_casino_ecarts_caisse`
--
DROP TABLE IF EXISTS `v_casino_ecarts_caisse`;

CREATE ALGORITHM=UNDEFINED SQL SECURITY DEFINER VIEW `v_casino_ecarts_caisse`  AS SELECT `cs`.`id` AS `session_id`, `c`.`nom` AS `caisse`, `r`.`nom` AS `salle`, `cs`.`user_id` AS `user_id`, `cs`.`ouverture_at` AS `ouverture_at`, `cs`.`fermeture_at` AS `fermeture_at`, `cs`.`fond_initial` AS `fond_initial`, `cs`.`fond_final_theorique` AS `fond_final_theorique`, `cs`.`fond_final_declare` AS `fond_final_declare`, `cs`.`ecart` AS `ecart` FROM ((`casino_cashier_sessions` `cs` join `casino_cashiers` `c` on(`c`.`id` = `cs`.`cashier_id`)) join `casino_rooms` `r` on(`r`.`id` = `c`.`room_id`)) ;

-- --------------------------------------------------------

--
-- Structure de la vue `v_casino_encours_credit`
--
DROP TABLE IF EXISTS `v_casino_encours_credit`;

CREATE ALGORITHM=UNDEFINED SQL SECURITY DEFINER VIEW `v_casino_encours_credit`  AS SELECT `cl`.`id` AS `client_id`, concat(`cl`.`nom`,' ',coalesce(`cl`.`prenom`,'')) AS `client`, count(`cr`.`id`) AS `nb_credits_actifs`, sum(`cr`.`encours`) AS `encours_total`, max(`cr`.`echeance`) AS `prochaine_echeance` FROM (`casino_credits` `cr` join `clients` `cl` on(`cl`.`id` = `cr`.`client_id`)) WHERE `cr`.`statut` in ('ACTIF','EN_RETARD') GROUP BY `cl`.`id`, `cl`.`nom`, `cl`.`prenom` ;

-- --------------------------------------------------------

--
-- Structure de la vue `v_casino_produit_net_jour`
--
DROP TABLE IF EXISTS `v_casino_produit_net_jour`;

CREATE ALGORITHM=UNDEFINED SQL SECURITY DEFINER VIEW `v_casino_produit_net_jour`  AS SELECT `r`.`id` AS `room_id`, `r`.`nom` AS `salle`, cast(`co`.`created_at` as date) AS `jour`, sum(case when `co`.`type_operation` in ('BUY_IN','DEPOT') then `co`.`montant` else 0 end) AS `total_entrees`, sum(case when `co`.`type_operation` in ('CASH_OUT','REMBOURSEMENT_CREDIT') then `co`.`montant` else 0 end) AS `total_sorties`, sum(case when `co`.`type_operation` in ('BUY_IN','DEPOT') then `co`.`montant` else 0 end) - sum(case when `co`.`type_operation` in ('CASH_OUT','REMBOURSEMENT_CREDIT') then `co`.`montant` else 0 end) AS `produit_net` FROM (((`casino_cash_operations` `co` join `casino_cashier_sessions` `cs` on(`cs`.`id` = `co`.`cashier_session_id`)) join `casino_cashiers` `c` on(`c`.`id` = `cs`.`cashier_id`)) join `casino_rooms` `r` on(`r`.`id` = `c`.`room_id`)) GROUP BY `r`.`id`, `r`.`nom`, cast(`co`.`created_at` as date) ;

--
-- Index pour les tables déchargées
--

--
-- Index pour la table `audit_logs`
--
ALTER TABLE `audit_logs`
  ADD PRIMARY KEY (`id`),
  ADD KEY `user_id` (`user_id`);

--
-- Index pour la table `caisse_transfers`
--
ALTER TABLE `caisse_transfers`
  ADD PRIMARY KEY (`id`),
  ADD KEY `idx_ct_module_source` (`module_source`,`session_source_id`),
  ADD KEY `idx_ct_module_destination` (`module_destination`,`session_destination_id`),
  ADD KEY `idx_ct_statut` (`statut`);

--
-- Index pour la table `casino_cards`
--
ALTER TABLE `casino_cards`
  ADD PRIMARY KEY (`id`),
  ADD UNIQUE KEY `uq_cards_numero` (`numero_carte`),
  ADD UNIQUE KEY `uq_cards_qr` (`qr_code`),
  ADD KEY `idx_cards_client` (`client_id`);

--
-- Index pour la table `casino_cashiers`
--
ALTER TABLE `casino_cashiers`
  ADD PRIMARY KEY (`id`),
  ADD UNIQUE KEY `uq_casino_cashiers_code` (`code`),
  ADD KEY `idx_casino_cashiers_room` (`room_id`);

--
-- Index pour la table `casino_cashier_sessions`
--
ALTER TABLE `casino_cashier_sessions`
  ADD PRIMARY KEY (`id`),
  ADD UNIQUE KEY `uq_one_open_session_per_cashier` (`cashier_id_if_open`),
  ADD KEY `idx_sessions_cashier` (`cashier_id`),
  ADD KEY `idx_sessions_user` (`user_id`),
  ADD KEY `idx_sessions_statut` (`statut`);

--
-- Index pour la table `casino_cash_operations`
--
ALTER TABLE `casino_cash_operations`
  ADD PRIMARY KEY (`id`),
  ADD UNIQUE KEY `uq_cashops_ref_flux` (`ref_flux_global`),
  ADD KEY `idx_cashops_session` (`cashier_session_id`),
  ADD KEY `idx_cashops_client` (`client_id`),
  ADD KEY `idx_cashops_type` (`type_operation`),
  ADD KEY `fk_cashops_credit` (`credit_id`);

--
-- Index pour la table `casino_chip_transactions`
--
ALTER TABLE `casino_chip_transactions`
  ADD PRIMARY KEY (`id`),
  ADD UNIQUE KEY `uq_chiptx_ref_flux` (`ref_flux_global`),
  ADD KEY `idx_chiptx_session` (`cashier_session_id`),
  ADD KEY `idx_chiptx_client` (`client_id`),
  ADD KEY `idx_chiptx_type` (`chip_type_id`);

--
-- Index pour la table `casino_chip_types`
--
ALTER TABLE `casino_chip_types`
  ADD PRIMARY KEY (`id`),
  ADD UNIQUE KEY `uq_chip_types_code` (`code`);

--
-- Index pour la table `casino_client_profiles`
--
ALTER TABLE `casino_client_profiles`
  ADD PRIMARY KEY (`id`),
  ADD UNIQUE KEY `uq_profile_client` (`client_id`);

--
-- Index pour la table `casino_credits`
--
ALTER TABLE `casino_credits`
  ADD PRIMARY KEY (`id`),
  ADD KEY `idx_credits_client` (`client_id`);

--
-- Index pour la table `casino_credit_repayments`
--
ALTER TABLE `casino_credit_repayments`
  ADD PRIMARY KEY (`id`),
  ADD KEY `idx_repayments_credit` (`credit_id`);

--
-- Index pour la table `casino_incidents`
--
ALTER TABLE `casino_incidents`
  ADD PRIMARY KEY (`id`),
  ADD KEY `idx_incidents_client` (`client_id`);

--
-- Index pour la table `casino_rooms`
--
ALTER TABLE `casino_rooms`
  ADD PRIMARY KEY (`id`),
  ADD UNIQUE KEY `uq_casino_rooms_code` (`code`);

--
-- Index pour la table `casino_scores`
--
ALTER TABLE `casino_scores`
  ADD PRIMARY KEY (`id`),
  ADD KEY `idx_scores_client` (`client_id`);

--
-- Index pour la table `casino_scoring_config`
--
ALTER TABLE `casino_scoring_config`
  ADD PRIMARY KEY (`id`),
  ADD UNIQUE KEY `uq_scoring_config_cle` (`cle`);

--
-- Index pour la table `casino_tables_jeu`
--
ALTER TABLE `casino_tables_jeu`
  ADD PRIMARY KEY (`id`),
  ADD UNIQUE KEY `uq_table_salle_numero` (`room_id`,`numero`);

--
-- Index pour la table `casino_table_caves`
--
ALTER TABLE `casino_table_caves`
  ADD PRIMARY KEY (`id`),
  ADD KEY `idx_table_date` (`table_jeu_id`,`date_jeu`),
  ADD KEY `idx_caves_session` (`cashier_session_id`),
  ADD KEY `idx_caves_client` (`client_id`),
  ADD KEY `fk_caves_cashop` (`cash_operation_id`);

--
-- Index pour la table `casino_table_pourboires`
--
ALTER TABLE `casino_table_pourboires`
  ADD PRIMARY KEY (`id`),
  ADD KEY `idx_pourboires_table` (`table_jeu_id`,`created_at`),
  ADD KEY `fk_pourboire_session` (`cashier_session_id`);

--
-- Index pour la table `casino_table_prolongations`
--
ALTER TABLE `casino_table_prolongations`
  ADD PRIMARY KEY (`id`),
  ADD KEY `idx_prolongations_table` (`table_jeu_id`,`created_at`),
  ADD KEY `fk_prolong_session` (`cashier_session_id`),
  ADD KEY `fk_prolong_client` (`client_id`),
  ADD KEY `fk_prolong_cashop` (`cash_operation_id`);

--
-- Index pour la table `casino_visits`
--
ALTER TABLE `casino_visits`
  ADD PRIMARY KEY (`id`),
  ADD KEY `idx_visits_client` (`client_id`),
  ADD KEY `idx_visits_room` (`room_id`);

--
-- Index pour la table `categories`
--
ALTER TABLE `categories`
  ADD PRIMARY KEY (`id`);

--
-- Index pour la table `clients`
--
ALTER TABLE `clients`
  ADD PRIMARY KEY (`id`),
  ADD UNIQUE KEY `code_client` (`code_client`),
  ADD KEY `idx_client_nom` (`nom`);

--
-- Index pour la table `client_accounts`
--
ALTER TABLE `client_accounts`
  ADD PRIMARY KEY (`id`),
  ADD UNIQUE KEY `uq_client_accounts_client` (`client_id`),
  ADD KEY `client_id` (`client_id`);

--
-- Index pour la table `client_kyc`
--
ALTER TABLE `client_kyc`
  ADD PRIMARY KEY (`id`),
  ADD UNIQUE KEY `uq_kyc_client` (`client_id`),
  ADD KEY `idx_kyc_agent` (`agent_verificateur`);

--
-- Index pour la table `equipments`
--
ALTER TABLE `equipments`
  ADD PRIMARY KEY (`id`),
  ADD UNIQUE KEY `code` (`code`);

--
-- Index pour la table `financial_transactions`
--
ALTER TABLE `financial_transactions`
  ADD PRIMARY KEY (`id`),
  ADD UNIQUE KEY `uq_financial_ref_flux` (`ref_flux_global`),
  ADD KEY `client_id` (`client_id`),
  ADD KEY `idx_financial_module` (`module`);

--
-- Index pour la table `housekeeping_tasks`
--
ALTER TABLE `housekeeping_tasks`
  ADD PRIMARY KEY (`id`),
  ADD KEY `room_id` (`room_id`),
  ADD KEY `assigned_user_id` (`assigned_user_id`);

--
-- Index pour la table `invoices`
--
ALTER TABLE `invoices`
  ADD PRIMARY KEY (`id`),
  ADD KEY `client_id` (`client_id`);

--
-- Index pour la table `invoice_items`
--
ALTER TABLE `invoice_items`
  ADD PRIMARY KEY (`id`),
  ADD KEY `invoice_id` (`invoice_id`);

--
-- Index pour la table `lost_and_found`
--
ALTER TABLE `lost_and_found`
  ADD PRIMARY KEY (`id`),
  ADD KEY `room_id` (`room_id`),
  ADD KEY `client_id` (`client_id`);

--
-- Index pour la table `loyalty_points`
--
ALTER TABLE `loyalty_points`
  ADD PRIMARY KEY (`id`),
  ADD KEY `client_id` (`client_id`);

--
-- Index pour la table `minibar_consumptions`
--
ALTER TABLE `minibar_consumptions`
  ADD PRIMARY KEY (`id`),
  ADD KEY `room_id` (`room_id`),
  ADD KEY `client_id` (`client_id`),
  ADD KEY `product_id` (`product_id`);

--
-- Index pour la table `notifications`
--
ALTER TABLE `notifications`
  ADD PRIMARY KEY (`id`);

--
-- Index pour la table `orders`
--
ALTER TABLE `orders`
  ADD PRIMARY KEY (`id`),
  ADD KEY `idx_orders_client` (`client_id`);

--
-- Index pour la table `order_items`
--
ALTER TABLE `order_items`
  ADD PRIMARY KEY (`id`),
  ADD KEY `order_id` (`order_id`),
  ADD KEY `product_id` (`product_id`);

--
-- Index pour la table `payments`
--
ALTER TABLE `payments`
  ADD PRIMARY KEY (`id`),
  ADD KEY `client_id` (`client_id`),
  ADD KEY `invoice_id` (`invoice_id`);

--
-- Index pour la table `products`
--
ALTER TABLE `products`
  ADD PRIMARY KEY (`id`),
  ADD UNIQUE KEY `code` (`code`),
  ADD KEY `category_id` (`category_id`);

--
-- Index pour la table `product_types`
--
ALTER TABLE `product_types`
  ADD PRIMARY KEY (`id`),
  ADD UNIQUE KEY `uk_product_types_nom` (`nom`);

--
-- Index pour la table `purchases`
--
ALTER TABLE `purchases`
  ADD PRIMARY KEY (`id`),
  ADD KEY `supplier_id` (`supplier_id`);

--
-- Index pour la table `purchase_items`
--
ALTER TABLE `purchase_items`
  ADD PRIMARY KEY (`id`),
  ADD KEY `purchase_id` (`purchase_id`),
  ADD KEY `product_id` (`product_id`);

--
-- Index pour la table `recipes`
--
ALTER TABLE `recipes`
  ADD PRIMARY KEY (`id`),
  ADD KEY `product_id` (`product_id`);

--
-- Index pour la table `recipe_items`
--
ALTER TABLE `recipe_items`
  ADD PRIMARY KEY (`id`),
  ADD KEY `recipe_id` (`recipe_id`),
  ADD KEY `ingredient_id` (`ingredient_id`);

--
-- Index pour la table `reservations`
--
ALTER TABLE `reservations`
  ADD PRIMARY KEY (`id`),
  ADD KEY `client_id` (`client_id`),
  ADD KEY `room_id` (`room_id`);

--
-- Index pour la table `reservation_guests`
--
ALTER TABLE `reservation_guests`
  ADD PRIMARY KEY (`id`),
  ADD KEY `reservation_id` (`reservation_id`);

--
-- Index pour la table `restaurant_cashiers`
--
ALTER TABLE `restaurant_cashiers`
  ADD PRIMARY KEY (`id`);

--
-- Index pour la table `restaurant_sessions`
--
ALTER TABLE `restaurant_sessions`
  ADD PRIMARY KEY (`id`),
  ADD KEY `cashier_id` (`cashier_id`),
  ADD KEY `user_id` (`user_id`);

--
-- Index pour la table `rooms`
--
ALTER TABLE `rooms`
  ADD PRIMARY KEY (`id`),
  ADD UNIQUE KEY `numero` (`numero`),
  ADD KEY `room_type_id` (`room_type_id`);

--
-- Index pour la table `room_equipments`
--
ALTER TABLE `room_equipments`
  ADD PRIMARY KEY (`id`),
  ADD KEY `fk_room_equipment_room` (`room_id`),
  ADD KEY `fk_room_equipment_equipment` (`equipment_id`);

--
-- Index pour la table `room_maintenance`
--
ALTER TABLE `room_maintenance`
  ADD PRIMARY KEY (`id`),
  ADD KEY `room_id` (`room_id`),
  ADD KEY `equipment_id` (`equipment_id`),
  ADD KEY `created_by` (`created_by`);

--
-- Index pour la table `room_minibar`
--
ALTER TABLE `room_minibar`
  ADD PRIMARY KEY (`id`),
  ADD KEY `room_id` (`room_id`),
  ADD KEY `product_id` (`product_id`);

--
-- Index pour la table `room_status_history`
--
ALTER TABLE `room_status_history`
  ADD PRIMARY KEY (`id`),
  ADD KEY `room_id` (`room_id`),
  ADD KEY `changed_by` (`changed_by`);

--
-- Index pour la table `room_types`
--
ALTER TABLE `room_types`
  ADD PRIMARY KEY (`id`);

--
-- Index pour la table `signatures`
--
ALTER TABLE `signatures`
  ADD PRIMARY KEY (`id`),
  ADD KEY `idx_signature_signable` (`signable_type`,`signable_id`,`signed_at`),
  ADD KEY `idx_signatures_client` (`client_id`);

--
-- Index pour la table `stays`
--
ALTER TABLE `stays`
  ADD PRIMARY KEY (`id`),
  ADD KEY `reservation_id` (`reservation_id`);

--
-- Index pour la table `stocks`
--
ALTER TABLE `stocks`
  ADD PRIMARY KEY (`id`),
  ADD KEY `product_id` (`product_id`),
  ADD KEY `location_id` (`location_id`);

--
-- Index pour la table `stock_locations`
--
ALTER TABLE `stock_locations`
  ADD PRIMARY KEY (`id`);

--
-- Index pour la table `stock_movements`
--
ALTER TABLE `stock_movements`
  ADD PRIMARY KEY (`id`),
  ADD KEY `product_id` (`product_id`),
  ADD KEY `location_id` (`location_id`);

--
-- Index pour la table `suppliers`
--
ALTER TABLE `suppliers`
  ADD PRIMARY KEY (`id`);

--
-- Index pour la table `tables_restaurant`
--
ALTER TABLE `tables_restaurant`
  ADD PRIMARY KEY (`id`);

--
-- Index pour la table `units`
--
ALTER TABLE `units`
  ADD PRIMARY KEY (`id`);

--
-- Index pour la table `users`
--
ALTER TABLE `users`
  ADD PRIMARY KEY (`id_admin`),
  ADD UNIQUE KEY `email` (`email`);

--
-- AUTO_INCREMENT pour les tables déchargées
--

--
-- AUTO_INCREMENT pour la table `audit_logs`
--
ALTER TABLE `audit_logs`
  MODIFY `id` bigint(20) UNSIGNED NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=23;

--
-- AUTO_INCREMENT pour la table `caisse_transfers`
--
ALTER TABLE `caisse_transfers`
  MODIFY `id` bigint(20) UNSIGNED NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=24;

--
-- AUTO_INCREMENT pour la table `casino_cards`
--
ALTER TABLE `casino_cards`
  MODIFY `id` bigint(20) UNSIGNED NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=2;

--
-- AUTO_INCREMENT pour la table `casino_cashiers`
--
ALTER TABLE `casino_cashiers`
  MODIFY `id` bigint(20) UNSIGNED NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=5;

--
-- AUTO_INCREMENT pour la table `casino_cashier_sessions`
--
ALTER TABLE `casino_cashier_sessions`
  MODIFY `id` bigint(20) UNSIGNED NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=9;

--
-- AUTO_INCREMENT pour la table `casino_cash_operations`
--
ALTER TABLE `casino_cash_operations`
  MODIFY `id` bigint(20) UNSIGNED NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=31;

--
-- AUTO_INCREMENT pour la table `casino_chip_transactions`
--
ALTER TABLE `casino_chip_transactions`
  MODIFY `id` bigint(20) UNSIGNED NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=19;

--
-- AUTO_INCREMENT pour la table `casino_chip_types`
--
ALTER TABLE `casino_chip_types`
  MODIFY `id` bigint(20) UNSIGNED NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=3;

--
-- AUTO_INCREMENT pour la table `casino_client_profiles`
--
ALTER TABLE `casino_client_profiles`
  MODIFY `id` bigint(20) UNSIGNED NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT pour la table `casino_credits`
--
ALTER TABLE `casino_credits`
  MODIFY `id` bigint(20) UNSIGNED NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT pour la table `casino_credit_repayments`
--
ALTER TABLE `casino_credit_repayments`
  MODIFY `id` bigint(20) UNSIGNED NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT pour la table `casino_incidents`
--
ALTER TABLE `casino_incidents`
  MODIFY `id` bigint(20) UNSIGNED NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT pour la table `casino_rooms`
--
ALTER TABLE `casino_rooms`
  MODIFY `id` bigint(20) UNSIGNED NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=4;

--
-- AUTO_INCREMENT pour la table `casino_scores`
--
ALTER TABLE `casino_scores`
  MODIFY `id` bigint(20) UNSIGNED NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=5;

--
-- AUTO_INCREMENT pour la table `casino_scoring_config`
--
ALTER TABLE `casino_scoring_config`
  MODIFY `id` bigint(20) UNSIGNED NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=9;

--
-- AUTO_INCREMENT pour la table `casino_tables_jeu`
--
ALTER TABLE `casino_tables_jeu`
  MODIFY `id` bigint(20) UNSIGNED NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=6;

--
-- AUTO_INCREMENT pour la table `casino_table_caves`
--
ALTER TABLE `casino_table_caves`
  MODIFY `id` bigint(20) UNSIGNED NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=5;

--
-- AUTO_INCREMENT pour la table `casino_table_pourboires`
--
ALTER TABLE `casino_table_pourboires`
  MODIFY `id` bigint(20) UNSIGNED NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=2;

--
-- AUTO_INCREMENT pour la table `casino_table_prolongations`
--
ALTER TABLE `casino_table_prolongations`
  MODIFY `id` bigint(20) UNSIGNED NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=2;

--
-- AUTO_INCREMENT pour la table `casino_visits`
--
ALTER TABLE `casino_visits`
  MODIFY `id` bigint(20) UNSIGNED NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=4;

--
-- AUTO_INCREMENT pour la table `categories`
--
ALTER TABLE `categories`
  MODIFY `id` bigint(20) UNSIGNED NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=16;

--
-- AUTO_INCREMENT pour la table `clients`
--
ALTER TABLE `clients`
  MODIFY `id` bigint(20) UNSIGNED NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=8;

--
-- AUTO_INCREMENT pour la table `client_accounts`
--
ALTER TABLE `client_accounts`
  MODIFY `id` bigint(20) UNSIGNED NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT pour la table `client_kyc`
--
ALTER TABLE `client_kyc`
  MODIFY `id` bigint(20) UNSIGNED NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=4;

--
-- AUTO_INCREMENT pour la table `equipments`
--
ALTER TABLE `equipments`
  MODIFY `id` bigint(20) UNSIGNED NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT pour la table `financial_transactions`
--
ALTER TABLE `financial_transactions`
  MODIFY `id` bigint(20) UNSIGNED NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=49;

--
-- AUTO_INCREMENT pour la table `housekeeping_tasks`
--
ALTER TABLE `housekeeping_tasks`
  MODIFY `id` bigint(20) UNSIGNED NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT pour la table `invoices`
--
ALTER TABLE `invoices`
  MODIFY `id` bigint(20) UNSIGNED NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT pour la table `invoice_items`
--
ALTER TABLE `invoice_items`
  MODIFY `id` bigint(20) UNSIGNED NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT pour la table `lost_and_found`
--
ALTER TABLE `lost_and_found`
  MODIFY `id` bigint(20) UNSIGNED NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT pour la table `loyalty_points`
--
ALTER TABLE `loyalty_points`
  MODIFY `id` bigint(20) UNSIGNED NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT pour la table `minibar_consumptions`
--
ALTER TABLE `minibar_consumptions`
  MODIFY `id` bigint(20) UNSIGNED NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT pour la table `notifications`
--
ALTER TABLE `notifications`
  MODIFY `id` bigint(20) UNSIGNED NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT pour la table `orders`
--
ALTER TABLE `orders`
  MODIFY `id` bigint(20) UNSIGNED NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT pour la table `order_items`
--
ALTER TABLE `order_items`
  MODIFY `id` bigint(20) UNSIGNED NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT pour la table `payments`
--
ALTER TABLE `payments`
  MODIFY `id` bigint(20) UNSIGNED NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT pour la table `products`
--
ALTER TABLE `products`
  MODIFY `id` bigint(20) UNSIGNED NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT pour la table `product_types`
--
ALTER TABLE `product_types`
  MODIFY `id` bigint(20) UNSIGNED NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=7;

--
-- AUTO_INCREMENT pour la table `purchases`
--
ALTER TABLE `purchases`
  MODIFY `id` bigint(20) UNSIGNED NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT pour la table `purchase_items`
--
ALTER TABLE `purchase_items`
  MODIFY `id` bigint(20) UNSIGNED NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT pour la table `recipes`
--
ALTER TABLE `recipes`
  MODIFY `id` bigint(20) UNSIGNED NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT pour la table `recipe_items`
--
ALTER TABLE `recipe_items`
  MODIFY `id` bigint(20) UNSIGNED NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT pour la table `reservations`
--
ALTER TABLE `reservations`
  MODIFY `id` bigint(20) UNSIGNED NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT pour la table `reservation_guests`
--
ALTER TABLE `reservation_guests`
  MODIFY `id` bigint(20) UNSIGNED NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT pour la table `restaurant_cashiers`
--
ALTER TABLE `restaurant_cashiers`
  MODIFY `id` bigint(20) UNSIGNED NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT pour la table `restaurant_sessions`
--
ALTER TABLE `restaurant_sessions`
  MODIFY `id` bigint(20) UNSIGNED NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT pour la table `rooms`
--
ALTER TABLE `rooms`
  MODIFY `id` bigint(20) UNSIGNED NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=2;

--
-- AUTO_INCREMENT pour la table `room_equipments`
--
ALTER TABLE `room_equipments`
  MODIFY `id` bigint(20) UNSIGNED NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT pour la table `room_maintenance`
--
ALTER TABLE `room_maintenance`
  MODIFY `id` bigint(20) UNSIGNED NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT pour la table `room_minibar`
--
ALTER TABLE `room_minibar`
  MODIFY `id` bigint(20) UNSIGNED NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT pour la table `room_status_history`
--
ALTER TABLE `room_status_history`
  MODIFY `id` bigint(20) UNSIGNED NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT pour la table `room_types`
--
ALTER TABLE `room_types`
  MODIFY `id` bigint(20) UNSIGNED NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=2;

--
-- AUTO_INCREMENT pour la table `signatures`
--
ALTER TABLE `signatures`
  MODIFY `id` bigint(20) UNSIGNED NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=9;

--
-- AUTO_INCREMENT pour la table `stays`
--
ALTER TABLE `stays`
  MODIFY `id` bigint(20) UNSIGNED NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT pour la table `stocks`
--
ALTER TABLE `stocks`
  MODIFY `id` bigint(20) UNSIGNED NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT pour la table `stock_locations`
--
ALTER TABLE `stock_locations`
  MODIFY `id` bigint(20) UNSIGNED NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=5;

--
-- AUTO_INCREMENT pour la table `stock_movements`
--
ALTER TABLE `stock_movements`
  MODIFY `id` bigint(20) UNSIGNED NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT pour la table `suppliers`
--
ALTER TABLE `suppliers`
  MODIFY `id` bigint(20) UNSIGNED NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT pour la table `tables_restaurant`
--
ALTER TABLE `tables_restaurant`
  MODIFY `id` bigint(20) UNSIGNED NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=2;

--
-- AUTO_INCREMENT pour la table `units`
--
ALTER TABLE `units`
  MODIFY `id` bigint(20) UNSIGNED NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=11;

--
-- AUTO_INCREMENT pour la table `users`
--
ALTER TABLE `users`
  MODIFY `id_admin` bigint(20) UNSIGNED NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=7;

--
-- Contraintes pour les tables déchargées
--

--
-- Contraintes pour la table `audit_logs`
--
ALTER TABLE `audit_logs`
  ADD CONSTRAINT `audit_logs_ibfk_1` FOREIGN KEY (`user_id`) REFERENCES `users` (`id_admin`);

--
-- Contraintes pour la table `casino_cards`
--
ALTER TABLE `casino_cards`
  ADD CONSTRAINT `fk_cards_client` FOREIGN KEY (`client_id`) REFERENCES `clients` (`id`);

--
-- Contraintes pour la table `casino_cashiers`
--
ALTER TABLE `casino_cashiers`
  ADD CONSTRAINT `fk_cashiers_room` FOREIGN KEY (`room_id`) REFERENCES `casino_rooms` (`id`);

--
-- Contraintes pour la table `casino_cashier_sessions`
--
ALTER TABLE `casino_cashier_sessions`
  ADD CONSTRAINT `fk_sessions_cashier` FOREIGN KEY (`cashier_id`) REFERENCES `casino_cashiers` (`id`);

--
-- Contraintes pour la table `casino_cash_operations`
--
ALTER TABLE `casino_cash_operations`
  ADD CONSTRAINT `fk_cashops_client` FOREIGN KEY (`client_id`) REFERENCES `clients` (`id`),
  ADD CONSTRAINT `fk_cashops_credit` FOREIGN KEY (`credit_id`) REFERENCES `casino_credits` (`id`),
  ADD CONSTRAINT `fk_cashops_session` FOREIGN KEY (`cashier_session_id`) REFERENCES `casino_cashier_sessions` (`id`);

--
-- Contraintes pour la table `casino_chip_transactions`
--
ALTER TABLE `casino_chip_transactions`
  ADD CONSTRAINT `fk_chiptx_client` FOREIGN KEY (`client_id`) REFERENCES `clients` (`id`),
  ADD CONSTRAINT `fk_chiptx_session` FOREIGN KEY (`cashier_session_id`) REFERENCES `casino_cashier_sessions` (`id`),
  ADD CONSTRAINT `fk_chiptx_type` FOREIGN KEY (`chip_type_id`) REFERENCES `casino_chip_types` (`id`);

--
-- Contraintes pour la table `casino_client_profiles`
--
ALTER TABLE `casino_client_profiles`
  ADD CONSTRAINT `fk_profile_client` FOREIGN KEY (`client_id`) REFERENCES `clients` (`id`);

--
-- Contraintes pour la table `casino_credits`
--
ALTER TABLE `casino_credits`
  ADD CONSTRAINT `fk_credits_client` FOREIGN KEY (`client_id`) REFERENCES `clients` (`id`);

--
-- Contraintes pour la table `casino_credit_repayments`
--
ALTER TABLE `casino_credit_repayments`
  ADD CONSTRAINT `fk_repayments_credit` FOREIGN KEY (`credit_id`) REFERENCES `casino_credits` (`id`);

--
-- Contraintes pour la table `casino_incidents`
--
ALTER TABLE `casino_incidents`
  ADD CONSTRAINT `fk_incidents_client` FOREIGN KEY (`client_id`) REFERENCES `clients` (`id`);

--
-- Contraintes pour la table `casino_scores`
--
ALTER TABLE `casino_scores`
  ADD CONSTRAINT `fk_scores_client` FOREIGN KEY (`client_id`) REFERENCES `clients` (`id`);

--
-- Contraintes pour la table `casino_tables_jeu`
--
ALTER TABLE `casino_tables_jeu`
  ADD CONSTRAINT `fk_tablesjeu_room` FOREIGN KEY (`room_id`) REFERENCES `casino_rooms` (`id`);

--
-- Contraintes pour la table `casino_table_caves`
--
ALTER TABLE `casino_table_caves`
  ADD CONSTRAINT `fk_caves_cashop` FOREIGN KEY (`cash_operation_id`) REFERENCES `casino_cash_operations` (`id`),
  ADD CONSTRAINT `fk_caves_client` FOREIGN KEY (`client_id`) REFERENCES `clients` (`id`),
  ADD CONSTRAINT `fk_caves_session` FOREIGN KEY (`cashier_session_id`) REFERENCES `casino_cashier_sessions` (`id`),
  ADD CONSTRAINT `fk_caves_table` FOREIGN KEY (`table_jeu_id`) REFERENCES `casino_tables_jeu` (`id`);

--
-- Contraintes pour la table `casino_table_pourboires`
--
ALTER TABLE `casino_table_pourboires`
  ADD CONSTRAINT `fk_pourboire_session` FOREIGN KEY (`cashier_session_id`) REFERENCES `casino_cashier_sessions` (`id`),
  ADD CONSTRAINT `fk_pourboire_table` FOREIGN KEY (`table_jeu_id`) REFERENCES `casino_tables_jeu` (`id`);

--
-- Contraintes pour la table `casino_table_prolongations`
--
ALTER TABLE `casino_table_prolongations`
  ADD CONSTRAINT `fk_prolong_cashop` FOREIGN KEY (`cash_operation_id`) REFERENCES `casino_cash_operations` (`id`),
  ADD CONSTRAINT `fk_prolong_client` FOREIGN KEY (`client_id`) REFERENCES `clients` (`id`),
  ADD CONSTRAINT `fk_prolong_session` FOREIGN KEY (`cashier_session_id`) REFERENCES `casino_cashier_sessions` (`id`),
  ADD CONSTRAINT `fk_prolong_table` FOREIGN KEY (`table_jeu_id`) REFERENCES `casino_tables_jeu` (`id`);

--
-- Contraintes pour la table `casino_visits`
--
ALTER TABLE `casino_visits`
  ADD CONSTRAINT `fk_visits_client` FOREIGN KEY (`client_id`) REFERENCES `clients` (`id`),
  ADD CONSTRAINT `fk_visits_room` FOREIGN KEY (`room_id`) REFERENCES `casino_rooms` (`id`);

--
-- Contraintes pour la table `client_accounts`
--
ALTER TABLE `client_accounts`
  ADD CONSTRAINT `client_accounts_ibfk_1` FOREIGN KEY (`client_id`) REFERENCES `clients` (`id`);

--
-- Contraintes pour la table `client_kyc`
--
ALTER TABLE `client_kyc`
  ADD CONSTRAINT `fk_kyc_agent` FOREIGN KEY (`agent_verificateur`) REFERENCES `users` (`id_admin`) ON DELETE SET NULL,
  ADD CONSTRAINT `fk_kyc_client` FOREIGN KEY (`client_id`) REFERENCES `clients` (`id`) ON DELETE CASCADE;

--
-- Contraintes pour la table `financial_transactions`
--
ALTER TABLE `financial_transactions`
  ADD CONSTRAINT `financial_transactions_ibfk_1` FOREIGN KEY (`client_id`) REFERENCES `clients` (`id`);

--
-- Contraintes pour la table `housekeeping_tasks`
--
ALTER TABLE `housekeeping_tasks`
  ADD CONSTRAINT `housekeeping_tasks_ibfk_1` FOREIGN KEY (`room_id`) REFERENCES `rooms` (`id`),
  ADD CONSTRAINT `housekeeping_tasks_ibfk_2` FOREIGN KEY (`assigned_user_id`) REFERENCES `users` (`id_admin`);

--
-- Contraintes pour la table `invoices`
--
ALTER TABLE `invoices`
  ADD CONSTRAINT `invoices_ibfk_1` FOREIGN KEY (`client_id`) REFERENCES `clients` (`id`);

--
-- Contraintes pour la table `invoice_items`
--
ALTER TABLE `invoice_items`
  ADD CONSTRAINT `invoice_items_ibfk_1` FOREIGN KEY (`invoice_id`) REFERENCES `invoices` (`id`);

--
-- Contraintes pour la table `lost_and_found`
--
ALTER TABLE `lost_and_found`
  ADD CONSTRAINT `lost_and_found_ibfk_1` FOREIGN KEY (`room_id`) REFERENCES `rooms` (`id`),
  ADD CONSTRAINT `lost_and_found_ibfk_2` FOREIGN KEY (`client_id`) REFERENCES `clients` (`id`);

--
-- Contraintes pour la table `loyalty_points`
--
ALTER TABLE `loyalty_points`
  ADD CONSTRAINT `loyalty_points_ibfk_1` FOREIGN KEY (`client_id`) REFERENCES `clients` (`id`);

--
-- Contraintes pour la table `minibar_consumptions`
--
ALTER TABLE `minibar_consumptions`
  ADD CONSTRAINT `minibar_consumptions_ibfk_1` FOREIGN KEY (`room_id`) REFERENCES `rooms` (`id`),
  ADD CONSTRAINT `minibar_consumptions_ibfk_2` FOREIGN KEY (`client_id`) REFERENCES `clients` (`id`),
  ADD CONSTRAINT `minibar_consumptions_ibfk_3` FOREIGN KEY (`product_id`) REFERENCES `products` (`id`);

--
-- Contraintes pour la table `orders`
--
ALTER TABLE `orders`
  ADD CONSTRAINT `orders_ibfk_1` FOREIGN KEY (`client_id`) REFERENCES `clients` (`id`);

--
-- Contraintes pour la table `order_items`
--
ALTER TABLE `order_items`
  ADD CONSTRAINT `order_items_ibfk_1` FOREIGN KEY (`order_id`) REFERENCES `orders` (`id`),
  ADD CONSTRAINT `order_items_ibfk_2` FOREIGN KEY (`product_id`) REFERENCES `products` (`id`);

--
-- Contraintes pour la table `payments`
--
ALTER TABLE `payments`
  ADD CONSTRAINT `payments_ibfk_1` FOREIGN KEY (`client_id`) REFERENCES `clients` (`id`),
  ADD CONSTRAINT `payments_ibfk_2` FOREIGN KEY (`invoice_id`) REFERENCES `invoices` (`id`);

--
-- Contraintes pour la table `products`
--
ALTER TABLE `products`
  ADD CONSTRAINT `products_ibfk_1` FOREIGN KEY (`category_id`) REFERENCES `categories` (`id`);

--
-- Contraintes pour la table `purchases`
--
ALTER TABLE `purchases`
  ADD CONSTRAINT `purchases_ibfk_1` FOREIGN KEY (`supplier_id`) REFERENCES `suppliers` (`id`);

--
-- Contraintes pour la table `purchase_items`
--
ALTER TABLE `purchase_items`
  ADD CONSTRAINT `purchase_items_ibfk_1` FOREIGN KEY (`purchase_id`) REFERENCES `purchases` (`id`),
  ADD CONSTRAINT `purchase_items_ibfk_2` FOREIGN KEY (`product_id`) REFERENCES `products` (`id`);

--
-- Contraintes pour la table `recipes`
--
ALTER TABLE `recipes`
  ADD CONSTRAINT `recipes_ibfk_1` FOREIGN KEY (`product_id`) REFERENCES `products` (`id`);

--
-- Contraintes pour la table `recipe_items`
--
ALTER TABLE `recipe_items`
  ADD CONSTRAINT `recipe_items_ibfk_1` FOREIGN KEY (`recipe_id`) REFERENCES `recipes` (`id`) ON DELETE CASCADE,
  ADD CONSTRAINT `recipe_items_ibfk_2` FOREIGN KEY (`ingredient_id`) REFERENCES `products` (`id`);

--
-- Contraintes pour la table `reservations`
--
ALTER TABLE `reservations`
  ADD CONSTRAINT `reservations_ibfk_1` FOREIGN KEY (`client_id`) REFERENCES `clients` (`id`),
  ADD CONSTRAINT `reservations_ibfk_2` FOREIGN KEY (`room_id`) REFERENCES `rooms` (`id`);

--
-- Contraintes pour la table `reservation_guests`
--
ALTER TABLE `reservation_guests`
  ADD CONSTRAINT `reservation_guests_ibfk_1` FOREIGN KEY (`reservation_id`) REFERENCES `reservations` (`id`) ON DELETE CASCADE;

--
-- Contraintes pour la table `restaurant_sessions`
--
ALTER TABLE `restaurant_sessions`
  ADD CONSTRAINT `restaurant_sessions_ibfk_1` FOREIGN KEY (`cashier_id`) REFERENCES `restaurant_cashiers` (`id`),
  ADD CONSTRAINT `restaurant_sessions_ibfk_2` FOREIGN KEY (`user_id`) REFERENCES `users` (`id_admin`);

--
-- Contraintes pour la table `rooms`
--
ALTER TABLE `rooms`
  ADD CONSTRAINT `rooms_ibfk_1` FOREIGN KEY (`room_type_id`) REFERENCES `room_types` (`id`);

--
-- Contraintes pour la table `room_equipments`
--
ALTER TABLE `room_equipments`
  ADD CONSTRAINT `fk_room_equipment_equipment` FOREIGN KEY (`equipment_id`) REFERENCES `equipments` (`id`) ON DELETE CASCADE,
  ADD CONSTRAINT `fk_room_equipment_room` FOREIGN KEY (`room_id`) REFERENCES `rooms` (`id`) ON DELETE CASCADE;

--
-- Contraintes pour la table `room_maintenance`
--
ALTER TABLE `room_maintenance`
  ADD CONSTRAINT `room_maintenance_ibfk_1` FOREIGN KEY (`room_id`) REFERENCES `rooms` (`id`),
  ADD CONSTRAINT `room_maintenance_ibfk_2` FOREIGN KEY (`equipment_id`) REFERENCES `equipments` (`id`),
  ADD CONSTRAINT `room_maintenance_ibfk_3` FOREIGN KEY (`created_by`) REFERENCES `users` (`id_admin`);

--
-- Contraintes pour la table `room_minibar`
--
ALTER TABLE `room_minibar`
  ADD CONSTRAINT `room_minibar_ibfk_1` FOREIGN KEY (`room_id`) REFERENCES `rooms` (`id`) ON DELETE CASCADE,
  ADD CONSTRAINT `room_minibar_ibfk_2` FOREIGN KEY (`product_id`) REFERENCES `products` (`id`);

--
-- Contraintes pour la table `room_status_history`
--
ALTER TABLE `room_status_history`
  ADD CONSTRAINT `room_status_history_ibfk_1` FOREIGN KEY (`room_id`) REFERENCES `rooms` (`id`),
  ADD CONSTRAINT `room_status_history_ibfk_2` FOREIGN KEY (`changed_by`) REFERENCES `users` (`id_admin`);

--
-- Contraintes pour la table `signatures`
--
ALTER TABLE `signatures`
  ADD CONSTRAINT `fk_signatures_client` FOREIGN KEY (`client_id`) REFERENCES `clients` (`id`) ON DELETE SET NULL;

--
-- Contraintes pour la table `stays`
--
ALTER TABLE `stays`
  ADD CONSTRAINT `stays_ibfk_1` FOREIGN KEY (`reservation_id`) REFERENCES `reservations` (`id`);

--
-- Contraintes pour la table `stocks`
--
ALTER TABLE `stocks`
  ADD CONSTRAINT `stocks_ibfk_1` FOREIGN KEY (`product_id`) REFERENCES `products` (`id`),
  ADD CONSTRAINT `stocks_ibfk_2` FOREIGN KEY (`location_id`) REFERENCES `stock_locations` (`id`);

--
-- Contraintes pour la table `stock_movements`
--
ALTER TABLE `stock_movements`
  ADD CONSTRAINT `stock_movements_ibfk_1` FOREIGN KEY (`product_id`) REFERENCES `products` (`id`),
  ADD CONSTRAINT `stock_movements_ibfk_2` FOREIGN KEY (`location_id`) REFERENCES `stock_locations` (`id`);
COMMIT;

/*!40101 SET CHARACTER_SET_CLIENT=@OLD_CHARACTER_SET_CLIENT */;
/*!40101 SET CHARACTER_SET_RESULTS=@OLD_CHARACTER_SET_RESULTS */;
/*!40101 SET COLLATION_CONNECTION=@OLD_COLLATION_CONNECTION */;
