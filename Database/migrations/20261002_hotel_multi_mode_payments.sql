-- Paiements partiels et multi-modes pour les réservations Hôtel.
-- À exécuter après 20260926_hotel_reservation_payments.sql.

SET @has_encaisse = (SELECT COUNT(*) FROM information_schema.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'reservation_payments' AND COLUMN_NAME = 'montant_encaisse');
SET @sql = IF(@has_encaisse = 0, 'ALTER TABLE reservation_payments ADD COLUMN montant_encaisse DECIMAL(12,2) NULL AFTER montant', 'SELECT 1');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

SET @has_credit = (SELECT COUNT(*) FROM information_schema.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'reservation_payments' AND COLUMN_NAME = 'montant_credit');
SET @sql = IF(@has_credit = 0, 'ALTER TABLE reservation_payments ADD COLUMN montant_credit DECIMAL(12,2) NULL AFTER montant_encaisse', 'SELECT 1');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

SET @has_gratuit = (SELECT COUNT(*) FROM information_schema.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'reservation_payments' AND COLUMN_NAME = 'montant_gratuit');
SET @sql = IF(@has_gratuit = 0, 'ALTER TABLE reservation_payments ADD COLUMN montant_gratuit DECIMAL(12,2) NULL AFTER montant_credit', 'SELECT 1');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

SET @has_status = (SELECT COUNT(*) FROM information_schema.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'reservation_payments' AND COLUMN_NAME = 'statut');
SET @sql = IF(@has_status = 0, 'ALTER TABLE reservation_payments ADD COLUMN statut VARCHAR(24) NULL AFTER moyen_paiement', 'SELECT 1');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

SET @has_key = (SELECT COUNT(*) FROM information_schema.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'reservation_payments' AND COLUMN_NAME = 'idempotency_key');
SET @sql = IF(@has_key = 0, 'ALTER TABLE reservation_payments ADD COLUMN idempotency_key VARCHAR(80) NULL AFTER ref_flux_global', 'SELECT 1');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

SET @has_key_index = (SELECT COUNT(*) FROM information_schema.STATISTICS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'reservation_payments' AND INDEX_NAME = 'uq_reservation_payment_idempotency');
SET @sql = IF(@has_key_index = 0, 'ALTER TABLE reservation_payments ADD UNIQUE KEY uq_reservation_payment_idempotency (reservation_id, idempotency_key)', 'SELECT 1');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

SET @has_res_encaisse = (SELECT COUNT(*) FROM information_schema.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'reservations' AND COLUMN_NAME = 'montant_encaisse');
SET @sql = IF(@has_res_encaisse = 0, 'ALTER TABLE reservations ADD COLUMN montant_encaisse DECIMAL(12,2) NOT NULL DEFAULT 0 AFTER montant_paye', 'SELECT 1');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

SET @has_res_credit = (SELECT COUNT(*) FROM information_schema.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'reservations' AND COLUMN_NAME = 'montant_credit');
SET @sql = IF(@has_res_credit = 0, 'ALTER TABLE reservations ADD COLUMN montant_credit DECIMAL(12,2) NOT NULL DEFAULT 0 AFTER montant_encaisse', 'SELECT 1');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

SET @has_res_gratuit = (SELECT COUNT(*) FROM information_schema.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'reservations' AND COLUMN_NAME = 'montant_gratuit');
SET @sql = IF(@has_res_gratuit = 0, 'ALTER TABLE reservations ADD COLUMN montant_gratuit DECIMAL(12,2) NOT NULL DEFAULT 0 AFTER montant_credit', 'SELECT 1');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

-- Classe les anciens paiements selon leur mode ; les autres restent de l'argent reçu.
UPDATE reservation_payments
   SET montant_encaisse = CASE WHEN UPPER(COALESCE(moyen_paiement, '')) IN ('CREDIT', 'GRATUIT') THEN 0 ELSE montant END,
       montant_credit = CASE WHEN UPPER(COALESCE(moyen_paiement, '')) = 'CREDIT' THEN montant ELSE 0 END,
       montant_gratuit = CASE WHEN UPPER(COALESCE(moyen_paiement, '')) = 'GRATUIT' THEN montant ELSE 0 END,
       statut = COALESCE(statut, 'ENREGISTRE')
 WHERE montant_encaisse IS NULL OR montant_credit IS NULL OR montant_gratuit IS NULL OR statut IS NULL;

-- Reconstitue les agrégats sans perdre les anciens soldes qui n'ont pas encore d'historique.
UPDATE reservations r
   SET r.montant_encaisse = COALESCE((SELECT SUM(p.montant_encaisse) FROM reservation_payments p WHERE p.reservation_id = r.id), r.montant_paye, 0),
       r.montant_credit = COALESCE((SELECT SUM(p.montant_credit) FROM reservation_payments p WHERE p.reservation_id = r.id), 0),
       r.montant_gratuit = COALESCE((SELECT SUM(p.montant_gratuit) FROM reservation_payments p WHERE p.reservation_id = r.id), 0),
       r.montant_paye = COALESCE((SELECT SUM(p.montant_encaisse + p.montant_gratuit) FROM reservation_payments p WHERE p.reservation_id = r.id), r.montant_paye, 0);

ALTER TABLE reservation_payments
  MODIFY COLUMN montant_encaisse DECIMAL(12,2) NOT NULL DEFAULT 0,
  MODIFY COLUMN montant_credit DECIMAL(12,2) NOT NULL DEFAULT 0,
  MODIFY COLUMN montant_gratuit DECIMAL(12,2) NOT NULL DEFAULT 0,
  MODIFY COLUMN statut VARCHAR(24) NOT NULL DEFAULT 'ENREGISTRE';