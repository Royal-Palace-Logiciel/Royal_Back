ALTER TABLE `casino_cashier_sessions`
  ADD COLUMN `rack_check_verifie` TINYINT(1) NOT NULL DEFAULT 0 COMMENT 'Validation du rack du croupier par le caissier',
  ADD COLUMN `rack_check_montant` BIGINT NULL COMMENT 'Montant de jetons présent dans le rack au moment du contrôle',
  ADD COLUMN `rack_check_manquant` BIGINT NULL COMMENT 'Manque de jetons constaté dans le rack',
  ADD COLUMN `rack_check_le` DATETIME NULL COMMENT 'Date de validation du rack check',
  ADD COLUMN `rack_check_par` BIGINT UNSIGNED NULL COMMENT 'Utilisateur qui a validé le rack check';

CREATE INDEX `idx_sessions_rack_check_verifie` ON `casino_cashier_sessions` (`rack_check_verifie`);
CREATE INDEX `idx_sessions_rack_check_manquant` ON `casino_cashier_sessions` (`rack_check_manquant`);
