-- Casino Reference/Configuration Data
-- Essential casino configuration data extracted from hda.sql
-- This data should be imported AFTER the clean schema and migrations
-- These are reference/configuration records needed for casino operations

-- Casino Scoring Configuration
INSERT INTO `casino_scoring_config` (`id`, `cle`, `valeur`, `description`, `updated_by`, `updated_at`) VALUES
(1, 'plafond_credit_defaut', '500000', 'Plafond de crédit par défaut (Ariary), surchargeable par carte', NULL, '2026-07-07 11:11:18'),
(2, 'poids_ratio_remboursement', '0.40', 'Poids du ratio (montants remboursés / accordés)', NULL, '2026-07-07 11:11:18'),
(3, 'poids_retard_moyen', '0.25', 'Poids du retard moyen de remboursement (jours)', NULL, '2026-07-07 11:11:18'),
(4, 'poids_encours_vs_plafond', '0.20', 'Poids du taux d''utilisation du plafond', NULL, '2026-07-07 11:11:18'),
(5, 'poids_anciennete', '0.10', 'Poids de l''ancienneté du client (mois)', NULL, '2026-07-07 11:11:18'),
(6, 'poids_regularite', '0.05', 'Poids de la régularité des visites/opérations', NULL, '2026-07-07 11:11:18'),
(7, 'seuil_bon_payeur', '75', 'Score >= seuil => catégorie BON', NULL, '2026-07-07 11:11:18'),
(8, 'seuil_moyen_payeur', '50', 'Score >= seuil (et < seuil_bon_payeur) => catégorie MOYEN, sinon MAUVAIS', NULL, '2026-07-07 11:11:18');

-- Casino Chip Types
INSERT INTO `casino_chip_types` (`id`, `code`, `nom`, `valeur_nominale`, `couleur`, `quantite_stock`, `statut`, `created_at`, `updated_at`) VALUES
(1, 'JT-01', 'Jetons 1000', 10000, '#D97757', 1900, 'ACTIF', '2026-07-07 11:56:34', '2026-07-09 10:06:28'),
(2, 'JT-03', 'Jeton 03', 1000, '#3b82f6', 81, 'ACTIF', '2026-07-08 15:26:04', '2026-07-09 10:23:23');

-- Casino Rooms
INSERT INTO `casino_rooms` (`id`, `code`, `nom`, `type_salle`, `statut`, `created_at`, `updated_at`) VALUES
(1, 'SALLES-VIP', 'salle VIP', 'VIP', 'OUVERTE', '2026-07-07 11:14:02', '2026-07-07 11:14:02'),
(2, 'SALLE-VIP-2', 'Salle VIP 2', 'VIP', 'OUVERTE', '2026-07-08 11:54:00', '2026-07-08 11:54:00');

-- Casino Gaming Tables
INSERT INTO `casino_tables_jeu` (`id`, `room_id`, `numero`, `type_jeu`, `cave_minimum`, `salaire_horaire_croupier`, `duree_prolongation_minutes`, `derniere_prolongation_at`, `statut`, `created_at`, `updated_at`) VALUES
(2, 1, 'T-1', 'POKER', 200000, 0, 60, '2026-07-16 14:18:20', 'ARCHIVEE', '2026-07-16 09:58:22', '2026-07-16 14:52:57');

-- Casino Cashiers
INSERT INTO `casino_cashiers` (`id`, `room_id`, `code`, `nom`, `statut`, `created_at`, `updated_at`) VALUES
(1, 1, 'CAISSE-01', 'Caisse N-01', 'OUVERTE', '2026-07-07 11:18:30', '2026-07-16 10:08:14'),
(2, 1, 'CAISSE-02', 'Caisse N-02', 'OUVERTE', '2026-07-07 11:19:07', '2026-07-16 10:08:18'),
(3, 2, 'C3', 'Caisse pour VIP 2', 'OUVERTE', '2026-07-08 15:38:14', '2026-07-08 15:47:28'),
(4, 2, 'C4', 'Caisse Pour VIP 2', 'OUVERTE', '2026-07-08 16:25:28', '2026-07-08 16:25:28');