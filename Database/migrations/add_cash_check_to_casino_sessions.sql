ALTER TABLE `casino_cashier_sessions`
  ADD COLUMN `cash_check` BIGINT NULL COMMENT 'Cash check / manque de caisse déclaré à la fermeture',
  ADD COLUMN `cashing_verifie` TINYINT(1) NOT NULL DEFAULT 0 COMMENT 'Validation du montant en espèces par le caissier',
  ADD COLUMN `cashing_verifie_le` DATETIME NULL COMMENT 'Date de validation du cashing par le caissier',
  ADD COLUMN `cashing_verifie_par` BIGINT UNSIGNED NULL COMMENT 'Caissier qui a validé le montant en caisse',
  ADD COLUMN `cashing_montant_verifie` BIGINT NULL COMMENT 'Montant physique en espèces vérifié par le caissier';

CREATE INDEX `idx_sessions_cash_check` ON `casino_cashier_sessions` (`cash_check`);
CREATE INDEX `idx_sessions_cashing_verifie` ON `casino_cashier_sessions` (`cashing_verifie`);
